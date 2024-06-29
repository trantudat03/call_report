const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const pool = require("./database");
const app = express();
const port = 4001;

app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://192.168.1.54:3000"],
  })
);
// Định nghĩa các route
app.get("/test", (req, res) => {
  pool.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("Kết nối thất bại!", err);
    } else {
      console.log("Kết nối thành công! Thời gian hiện tại:", res.rows[0]);
    }

    // Đóng kết nối sau khi kiểm tra
    pool.end();
  });
  res.send("Hello World!");
});

app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json({
      status: "success",
      data: result.rows,
      message: "Data retrieved successfully",
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    res.status(500).json({
      status: "error",
      error: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
});

app.get("/callList", async (req, res) => {
  try {
    const query = `
        SELECT 
            s.call_id,
            s.src_part_id,
            src_info.display_name AS src_display_name,
            src_info.caller_number AS src_caller_number,
            s.dst_part_id,
            dst_info.display_name AS did_name,
            s.start_time,
            s.end_time,
            c.is_answered,
            c.ringing_dur,
            c.talking_dur,
            p.is_inbound
        FROM 
            cl_segments s
        JOIN 
            cl_calls c ON s.call_id = c.id
        JOIN 
            cl_party_info src_info ON s.src_part_id = src_info.id
        JOIN 
            cl_party_info dst_info ON s.dst_part_id = dst_info.id
        JOIN 
            cl_participants p ON s.call_id = p.call_id AND s.src_part_id = p.id
        WHERE 
            (s.id, s.call_id) IN (
                SELECT MIN(id), call_id 
                FROM cl_segments 
                GROUP BY call_id
            )
        ORDER BY 
            s.call_id;
    `;

    const query1 = `
        SELECT 
            s.call_id,
            s.src_part_id,
            src_info.display_name AS src_display_name,
            src_info.caller_number AS src_caller_number,
            s.dst_part_id,
            dst_info.display_name AS did_name,
            s.start_time,
            s.end_time,
            c.is_answered,
            c.ringing_dur,
            c.talking_dur,
            max_actions.max_action_id
        FROM 
            cl_segments s
        JOIN 
            cl_calls c ON s.call_id = c.id
        JOIN 
            cl_party_info src_info ON s.src_part_id = src_info.id
        JOIN 
            cl_party_info dst_info ON s.dst_part_id = dst_info.id
        JOIN 
            (SELECT call_id, MAX(action_id) AS max_action_id FROM cl_segments GROUP BY call_id) max_actions ON s.call_id = max_actions.call_id
        WHERE 
            (s.id, s.call_id) IN (
                SELECT MIN(id), call_id 
                FROM cl_segments 
                GROUP BY call_id
            )
        ORDER BY 
            s.call_id;
    `;

    const { rows } = await pool.query(query1);
    const lht = rows.length;
    res.json(rows);
  } catch (err) {
    console.error("Error executing query", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

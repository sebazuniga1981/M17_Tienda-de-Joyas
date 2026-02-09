const { Router } = require("express");
const pool = require("../db/connection");

const router = Router();


router.get("/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT NOW() as now;");
    res.json({ ok: true, db_time: rows[0].now });
  } catch (error) {
    console.error("❌ ERROR /health:", error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error),
      code: error?.code || null,
    });
  }
});


router.get("/joyas", async (req, res) => {
  try {
    const limits = Math.max(parseInt(req.query.limits) || 10, 1);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const order_by = (req.query.order_by || "id_ASC").toString();

    const [campoRaw, dirRaw] = order_by.split("_");
    const campo = (campoRaw || "id").toLowerCase();
    const dir = (dirRaw || "ASC").toUpperCase();

    const allowedFields = ["id", "nombre", "categoria", "metal", "precio", "stock"];
    if (!allowedFields.includes(campo)) {
      return res.status(400).json({
        error: `order_by inválido. Campo permitido: ${allowedFields.join(", ")}`,
      });
    }
    if (!["ASC", "DESC"].includes(dir)) {
      return res.status(400).json({ error: "order_by inválido. Usa ASC o DESC." });
    }

    const offset = (page - 1) * limits;

    const totalQuery = await pool.query("SELECT COUNT(*)::int AS total FROM inventario;");
    const stockQuery = await pool.query(
      "SELECT COALESCE(SUM(stock),0)::int AS stock_total FROM inventario;"
    );

    const dataQuery = await pool.query(
      `SELECT id, nombre, categoria, metal, precio, stock
       FROM inventario
       ORDER BY ${campo} ${dir}
       LIMIT $1 OFFSET $2;`,
      [limits, offset]
    );

    const joyas = dataQuery.rows;

    const results = joyas.map((j) => ({
      name: j.nombre,
      href: `/joyas/joya/${j.id}`,
    }));

    return res.json({
      totalJoyas: totalQuery.rows[0].total,
      stockTotal: stockQuery.rows[0].stock_total,
      results,
    });
  } catch (error) {
    console.error("❌ ERROR GET /joyas:", error);
    return res.status(500).json({
      error: "Error al obtener joyas",
      detail: String(error?.message || error),
    });
  }
});


router.get("/joyas/filtros", async (req, res) => {
  try {
    const { precio_min, precio_max, categoria, metal } = req.query;

    const filtros = [];
    const values = [];

    if (precio_min !== undefined) {
      if (Number.isNaN(Number(precio_min))) {
        return res.status(400).json({ error: "precio_min debe ser numérico" });
      }
      values.push(Number(precio_min));
      filtros.push(`precio >= $${values.length}`);
    }

    if (precio_max !== undefined) {
      if (Number.isNaN(Number(precio_max))) {
        return res.status(400).json({ error: "precio_max debe ser numérico" });
      }
      values.push(Number(precio_max));
      filtros.push(`precio <= $${values.length}`);
    }

    if (categoria !== undefined) {
      values.push(String(categoria));
      filtros.push(`categoria = $${values.length}`);
    }

    if (metal !== undefined) {
      values.push(String(metal));
      filtros.push(`metal = $${values.length}`);
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const query = `
      SELECT id, nombre, categoria, metal, precio, stock
      FROM inventario
      ${where}
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query, values);
    return res.json(rows);
  } catch (error) {
    console.error("❌ ERROR GET /joyas/filtros:", error);
    return res.status(500).json({
      error: "Error al filtrar joyas",
      detail: String(error?.message || error),
    });
  }
});

module.exports = router;

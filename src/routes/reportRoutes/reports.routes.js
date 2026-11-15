const router = require("express").Router();
const c = require("../../controllers/reportContoller/reports.controller");

router.get("/daily", c.daily);
router.get("/month-to-date", c.monthToDate);
router.get("/monthly", c.monthly);

module.exports = router;
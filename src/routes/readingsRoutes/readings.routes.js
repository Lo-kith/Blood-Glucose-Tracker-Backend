const router = require("express").Router();
const c = require("../../controllers/readingControllers/readings.controller");

router.get("/", c.list);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
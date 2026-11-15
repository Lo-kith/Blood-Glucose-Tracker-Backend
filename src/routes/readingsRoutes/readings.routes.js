const router = require("express").Router();
const c = require("../../controllers/readingControllers/readings.controller");
const listReadingsByRange = require("../../controllers/readings/listReadingsByRange.controller");

// Keep /range above any /:id route so it is not treated as an id.
router.get("/range", listReadingsByRange);
router.get("/", c.list);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
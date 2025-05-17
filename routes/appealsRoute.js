const express = require("express");

const router = express.Router();
const appealsController = require("../controllers/appealsController");

router.use(express.json());

router.post("/appeals", appealsController.createAppeal);

router.get("/appeals", appealsController.getAppeals);

router.patch("/appeals/:id/in-progress", appealsController.workOnAppeal);

router.patch("/appeals/:id/complete", appealsController.completeAppeal);

router.patch("/appeals/:id/cancel", appealsController.cancelAppeal);

router.patch("/appeals/bulk-cancel", appealsController.cancelAllAppealsWithInProgressStatus);

module.exports = router;    

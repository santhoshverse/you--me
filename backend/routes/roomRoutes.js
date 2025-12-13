import express from "express";
import { createRoom, getRoom, registerGuest, getPublicRooms } from "../controllers/roomController.js";

const router = express.Router();

router.get("/", getPublicRooms);
router.post("/create", createRoom);
router.post("/guest", registerGuest);
router.get("/:roomId", getRoom);

export default router;

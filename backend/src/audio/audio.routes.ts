import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as audioController from "./audio.controller";
 
export const audioRouter = Router();
 
audioRouter.use(requireAuth, requireRole("CANDIDATE"));
 
audioRouter.get("/session/:sessionId/question/:questionId/prompt", audioController.prompt);
 
audioRouter.post(
  "/session/:sessionId/question/:questionId/submit",
  audioController.audioUploadMiddleware,
  audioController.submit
);
 
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as assessmentController from "./assessment.controller";

export const assessmentRouter = Router();

assessmentRouter.use(requireAuth, requireRole("CANDIDATE"));

assessmentRouter.post("/start", assessmentController.start);
assessmentRouter.get("/status", assessmentController.status);
assessmentRouter.get("/result", assessmentController.result);

assessmentRouter.get("/session/current", assessmentController.currentSession);
assessmentRouter.post("/session/:sessionId/answer", assessmentController.submitAnswer);
assessmentRouter.post("/session/:sessionId/complete", assessmentController.completeSession);

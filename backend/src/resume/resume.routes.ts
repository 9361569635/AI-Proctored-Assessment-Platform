import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as resumeController from "./resume.controller";

export const resumeRouter = Router();

resumeRouter.use(requireAuth, requireRole("CANDIDATE"));

resumeRouter.post("/upload", resumeController.resumeUploadMiddleware, resumeController.uploadHandler);
resumeRouter.post("/analyze", resumeController.analyzeHandler);
resumeRouter.get("/me", resumeController.getMyResumeHandler);

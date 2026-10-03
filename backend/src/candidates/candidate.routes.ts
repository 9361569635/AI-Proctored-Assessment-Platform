import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as candidateController from "./candidate.controller";

export const candidateRouter = Router();

candidateRouter.use(requireAuth, requireRole("CANDIDATE"));

candidateRouter.post("/photo", candidateController.photoUploadMiddleware, candidateController.uploadPhoto);
candidateRouter.get("/photo", candidateController.getPhoto);
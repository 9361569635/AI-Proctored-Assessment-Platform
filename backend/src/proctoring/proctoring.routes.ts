import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as proctoringController from "./proctoring.controller";
import * as capabilityController from "./capability.controller";

export const proctoringRouter = Router();

proctoringRouter.use(requireAuth, requireRole("CANDIDATE"));

proctoringRouter.post("/event", proctoringController.recordEvent);
proctoringRouter.post("/capabilities", capabilityController.recordCapabilitiesController);

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as codingQuestionController from "./codingQuestion.controller";
import * as codingController from "./coding.controller";

export const codingRouter = Router();

const questionsRouter = Router();
questionsRouter.use(requireAuth, requireRole("MANAGEMENT", "SUPER_ADMIN"));
questionsRouter.post("/", codingQuestionController.create);
questionsRouter.get("/", codingQuestionController.list);
questionsRouter.get("/:id", codingQuestionController.getById);
codingRouter.use("/questions", questionsRouter);

codingRouter.use(requireAuth, requireRole("CANDIDATE"));
codingRouter.post("/session/:sessionId/submit", codingController.submit);
codingRouter.post("/session/:sessionId/run", codingController.run);
codingRouter.put("/session/:sessionId/questions/:codingQuestionId/draft", codingController.saveDraft);
codingRouter.get("/session/:sessionId/questions/:codingQuestionId/draft", codingController.getDrafts);
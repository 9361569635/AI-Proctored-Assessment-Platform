import { Router } from "express";
import { authRouter } from "../auth/auth.routes";
import { jobRoleRouter } from "../job-roles/jobRole.routes";
import { resumeRouter } from "../resume/resume.routes";
import { assessmentRouter } from "../assessment/assessment.routes";
import { codingRouter } from "../coding/coding.routes";
import { managementRouter } from "../management/management.routes";
import { audioRouter } from "../audio/audio.routes";
import { proctoringRouter } from "../proctoring/proctoring.routes";
import { candidateRouter } from "../candidates/candidate.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/job-roles", jobRoleRouter);
apiRouter.use("/resume", resumeRouter);
apiRouter.use("/assessment", assessmentRouter);
apiRouter.use("/coding", codingRouter);
apiRouter.use("/management", managementRouter);
apiRouter.use("/audio", audioRouter);
apiRouter.use("/proctoring", proctoringRouter);
apiRouter.use("/candidate", candidateRouter);
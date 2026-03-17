import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import authGoogleRouter from "./auth-google";
import channelsRouter from "./channels";
import streamsRouter from "./streams";
import billingRouter from "./billing";
import serverRouter from "./server";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(authGoogleRouter);
router.use(channelsRouter);
router.use(streamsRouter);
router.use(billingRouter);
router.use(serverRouter);

export default router;

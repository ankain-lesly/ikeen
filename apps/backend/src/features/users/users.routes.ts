import { Router } from "express";
import { AUTH } from "../../shared/middlewares/auth";
import { validate } from "../../shared/middlewares/validation";
import * as Controller from "./users.controller";
import * as Validator from "./users.validator";

const router = Router();

router.use(AUTH.basic);

router.get("/me", Controller.getMe);
router.patch("/me", validate(Validator.updateProfileSchema), Controller.patchMe);
router.post(
  "/me/push-token",
  validate(Validator.pushTokenSchema),
  Controller.registerPushToken,
);

export default router;

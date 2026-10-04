import axiosInstance from "./axiosInstance";
import type { RegisterFormValues } from "../types";

/**
 * GET / — Health Check
 * Confirms the API is reachable.
 */
export const healthCheck = () => axiosInstance.get("/");

/**
 * POST /users/signup — Create a new account.
 *
 * NOTE: field names below are based on the Register form shown in the
 * design (name, username, email, gender, dateOfBirth, password,
 * rePassword). Double-check these against the Postman collection's
 * "Signup" request body and adjust here if any key differs — this is
 * the only place the payload shape needs to change.
 */
export const signup = (data: RegisterFormValues) =>
  axiosInstance.post("/users/signup", {
    name: data.name,
    username: data.username || undefined,
    email: data.email,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    password: data.password,
    rePassword: data.rePassword,
  });

/**
 * POST /users/signin — Login with email, username, or `login` + password.
 */
export const signin = ({ login, password }: { login: string; password: string }) =>
  axiosInstance.post("/users/signin", {
    login,
    password,
  });

/**
 * PATCH /users/change-password — Requires Bearer token (attached by the
 * axios interceptor once the user is logged in).
 */
export const changePassword = ({
  password,
  newPassword,
}: {
  password: string;
  newPassword: string;
}) =>
  axiosInstance.patch("/users/change-password", {
    password,
    newPassword,
  });

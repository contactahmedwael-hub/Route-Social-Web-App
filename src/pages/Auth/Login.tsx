import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiLock } from "react-icons/fi";
import { signin } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import { extractAuthPayload } from "../../utils/authResponse";
import type { LoginFormValues } from "../../types";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const inputClass =
  "w-full bg-gray-50 border rounded-lg py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy";

export default function Login() {
  useDocumentTitle("Login");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ mode: "onBlur" });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    setLoading(true);
    try {
      const { data } = await signin({
        login: values.login,
        password: values.password,
      });
      const { token, user: userData } = extractAuthPayload(data);

      if (!token) {
        // The request succeeded but the response didn't have a token in any
        // shape we recognize — log it so the real key can be confirmed.
        console.error("Signin succeeded but no token was found in:", data);
        setServerError(
          "Logged in, but no auth token was found in the response. Open the browser console and check the logged response — tell me the key it's under and I'll fix it."
        );
        return;
      }

      login(token, userData);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Signin failed:", err);
      setServerError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Log in to Route Posts</h2>
      <p className="text-sm text-gray-500 mb-6">Log in and continue your social journey.</p>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${inputClass} ${errors.login ? "border-red-400" : "border-gray-200"}`}
              placeholder="Email or username"
              {...register("login", {
                required: "Email or username is required",
              })}
            />
          </div>
          {errors.login && (
            <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              className={`${inputClass} ${errors.password ? "border-red-400" : "border-gray-200"}`}
              placeholder="Password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "At least 6 characters" },
              })}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rp-navy hover:bg-rp-navy-dark disabled:opacity-70 text-white font-semibold rounded-lg py-2.5 transition-colors"
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>

      <Link
        to="/auth/forgot-password"
        className="block text-center mt-4 text-sm text-rp-navy hover:underline"
      >
        Forgot password?
      </Link>
    </>
  );
}
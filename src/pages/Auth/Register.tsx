import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiUsers, FiCalendar, FiLock } from "react-icons/fi";
import { signup } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import { extractAuthPayload } from "../../utils/authResponse";
import type { RegisterFormValues } from "../../types";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const inputClass =
  "w-full bg-gray-50 border rounded-lg py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy";
const selectClass =
  "w-full bg-gray-50 border rounded-lg py-2.5 pl-10 pr-3 text-sm text-gray-700 " +
  "focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy";

export default function Register() {
  useDocumentTitle("Register");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({ mode: "onBlur" });

  const password = watch("password");

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError("");
    setLoading(true);
    try {
      const { data } = await signup(values);
      const { token, user: userData } = extractAuthPayload(data);

      if (token) {
        login(token, userData);
        navigate("/", { replace: true });
      } else {
        // Signup succeeded but didn't log the user in automatically —
        // that's a normal API design, so just send them to sign in.
        navigate("/auth/login");
      }
    } catch (err: any) {
      console.error("Signup failed:", err);
      setServerError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Create a new account</h2>
      <p className="text-sm text-gray-500 mb-6">It is quick and easy.</p>

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
              className={`${inputClass} ${errors.name ? "border-red-400" : "border-gray-200"}`}
              placeholder="Full name"
              {...register("name", {
                required: "Full name is required",
                minLength: { value: 3, message: "At least 3 characters" },
              })}
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${inputClass} ${errors.username ? "border-red-400" : "border-gray-200"}`}
              placeholder="Username (optional)"
              {...register("username", {
                pattern: {
                  value: /^[a-z0-9_]{3,30}$/,
                  message: "3-30 characters: lowercase letters, numbers, and underscores only",
                },
              })}
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              className={`${inputClass} ${errors.email ? "border-red-400" : "border-gray-200"}`}
              placeholder="Email address"
              {...register("email", {
                required: "Email address is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <div className="relative">
            <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <select
              defaultValue=""
              className={`${selectClass} ${errors.gender ? "border-red-400" : "border-gray-200"} appearance-none`}
              {...register("gender", { required: "Please select a gender" })}
            >
              <option value="" disabled>
                Select gender
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
        </div>

        <div>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className={`${inputClass} ${errors.dateOfBirth ? "border-red-400" : "border-gray-200"}`}
              {...register("dateOfBirth", {
                required: "Date of birth is required",
              })}
            />
          </div>
          {errors.dateOfBirth && (
            <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>
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
                pattern: {
                  value: /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
                  message:
                    "At least 8 characters, with an uppercase letter, a lowercase letter, a number, and one of # ? ! @ $ % ^ & * -",
                },
              })}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              className={`${inputClass} ${errors.rePassword ? "border-red-400" : "border-gray-200"}`}
              placeholder="Confirm password"
              {...register("rePassword", {
                required: "Please confirm your password",
                validate: (value) => value === password || "Passwords do not match",
              })}
            />
          </div>
          {errors.rePassword && (
            <p className="mt-1 text-xs text-red-600">{errors.rePassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rp-navy hover:bg-rp-navy-dark disabled:opacity-70 text-white font-semibold rounded-lg py-2.5 transition-colors"
        >
          {loading ? "Creating account…" : "Create New Account"}
        </button>
      </form>
    </>
  );
}
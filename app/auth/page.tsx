"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Ensure user_metadata has name, set if missing
        if (!data.user.user_metadata?.name) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              name: data.user.email?.split('@')[0] || 'User'
            }
          });
          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }
        }
      }

      toast.success("Logged in successfully!");
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?mode=login`,
          data: {
            name: name.trim()
          }
        }
      });

      if (error) throw error;

      // Name is already set via options.data in signUp, no need to call updateUser
      // updateUser requires an active session which may not exist if email confirmation is required
      if (data.user) {
        toast.success("Account created successfully! Please check your email to verify your account.");
      } else {
        toast.success("Account created! Please check your email to verify your account.");
      }

      // Clear form and switch to login
      setMode("login");
      setName("");
      setPassword("");
      setConfirmPassword("");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Please check your inbox.");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-primary to-secondary p-4">
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === "login" && "Sign in to your account to continue"}
            {mode === "signup" && "Create a new account to get started"}
            {mode === "forgot" && "Enter your email to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={
              mode === "login"
                ? handleLogin
                : mode === "signup"
                ? handleSignup
                : handleForgotPassword
            }
            className="space-y-4"
          >
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground stroke-current" strokeWidth={2} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground stroke-current" strokeWidth={2} />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground stroke-current" strokeWidth={2} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 stroke-current" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4 stroke-current" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground stroke-current" strokeWidth={2} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 stroke-current" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4 stroke-current" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary"
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : mode === "login"
                ? "Sign In"
                : mode === "signup"
                ? "Sign Up"
                : "Send Reset Email"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "login" && (
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-4 w-4 stroke-current" strokeWidth={2} />
                Back to login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-center text-white/80 w-full max-w-md">
        Made with <span className="text-red-400">♥</span> by Chinmaya Kapopara
      </p>
    </div>
  );
}

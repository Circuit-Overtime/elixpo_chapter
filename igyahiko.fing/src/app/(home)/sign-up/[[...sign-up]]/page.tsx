"use client";
import React, { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Eye, EyeClosed, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleSVG from "../../../../../public/google.svg";
import Image from "next/image";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSignUp, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ClerkAPIError } from "@clerk/types";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SignUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type SignUpSchema = z.infer<typeof SignUpSchema>;

const Page = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [pendingVerification, setPendingVerification] =
    useState<boolean>(false);
  const [emailCode, setEmailCode] = useState("");
  const [error, setError] = useState<ClerkAPIError[]>();
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<SignUpSchema>({
    resolver: zodResolver(SignUpSchema),
  });

  const { isLoaded, signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const router = useRouter();

  /** STEP 1: Create account and trigger email verification */
  const onSubmit = async (data: SignUpSchema) => {
    if (!isLoaded || !signUp || !setActive) return null;
    setError(undefined);

    try {
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (result.status === "missing_requirements") {
        // Trigger sending email verification code
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setPendingVerification(true);
      } else if (result.status === "complete") {
        // (rare case, usually requires no verification)
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        console.log("Unexpected sign-up status:", result);
      }
    } catch (error) {
      if (isClerkAPIResponseError(error)) setError(error.errors);
      console.error(error);
    }
  };

  /** STEP 2: Verify email code */
  const onVerify = async () => {
    if (!signUp || !setActive) return;
    setError(undefined);
    try {
      setVerifyLoading(true);
      const result = await signUp.attemptEmailAddressVerification({
        code: emailCode,
      });

      if (result.status === "complete") {
        setVerifyLoading(false);
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        console.log("Unexpected verification status:", result);
      }
    } catch (error) {
      if (isClerkAPIResponseError(error)) setError(error.errors);
      console.error(error);
    }
  };

  /** Google OAuth Sign-in */
  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/",
        redirectUrlComplete: "/",
      });
      router.push("/");
    } catch (err) {
      console.error("Google OAuth error:", err);
    }
  };

  return (
    <AuthLayout>
      <section className="flex flex-col justify-center items-center w-full bg-dot-black/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {pendingVerification ? "Verify Your Email" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {pendingVerification
                ? "Enter the code sent to your email."
                : "Fill in your details to get started."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && error.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error.map((errItem, index) => (
                    <p key={index}>{errItem.longMessage || errItem.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {!pendingVerification ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="firstName"
                      placeholder="John"
                      {...register("firstName")}
                    />
                    <InputGroupAddon>
                      <User className="text-gray-500" />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.firstName && (
                    <p className="text-xs text-red-500">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="lastName"
                      placeholder="Doe"
                      {...register("lastName")}
                    />
                    <InputGroupAddon>
                      <User className="text-gray-500" />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.lastName && (
                    <p className="text-xs text-red-500">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register("email")}
                    />
                    <InputGroupAddon>
                      <Mail className="text-gray-500" />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.email && (
                    <p className="text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                    />
                    <InputGroupAddon>
                      <Lock className="text-gray-500" />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer focus:outline-none"
                      >
                        {showPassword ? <Eye /> : <EyeClosed />}
                      </button>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.password && (
                    <p className="text-xs text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-mono text-white bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 animate-shine"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </form>
            ) : (
              // Verification form
              <div className="space-y-4">
                <Label htmlFor="code">Verification Code</Label>
                <InputGroup>
                  <InputGroupInput
                    id="code"
                    placeholder="Enter your code"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                </InputGroup>
                <Button
                  onClick={onVerify}
                  disabled={!emailCode}
                  className="w-full font-mono text-white bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 animate-shine"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
              </div>
            )}
          </CardContent>

          {!pendingVerification && (
            <CardFooter className="flex flex-col gap-4 mt-4">
              <div className="relative w-full flex items-center justify-center text-sm text-gray-500">
                <div className="flex-grow border-t border-gray-300" />
                <span className="px-3">or</span>
                <div className="flex-grow border-t border-gray-300" />
              </div>

              <div
                className={`flex gap-2 items-center justify-center border w-full px-4 py-2 rounded cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 ${
                  verifyLoading ? "animate-pulse" : ""
                }`}
                onClick={handleGoogleSignIn}
              >
                <Image
                  src={GoogleSVG}
                  alt="Google logo"
                  width={20}
                  height={20}
                />
                Google
              </div>

              <div className="text-center text-sm">
                <span>Already have an account? </span>
                <Link href="/sign-in" className="text-blue-500">
                  Sign In
                </Link>
              </div>

              <p className="text-xs text-center text-gray-500">
                By clicking continue, you agree to our <br />
                <span className="underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="underline cursor-pointer">Privacy Policy</span>
                .
              </p>
            </CardFooter>
          )}
        </Card>
      </section>
    </AuthLayout>
  );
};

export default Page;

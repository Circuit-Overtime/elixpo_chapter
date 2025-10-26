"use client";
import React, { useState } from "react";
// import { useCurrentTheme } from "@/hooks/use-current-theme";
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
import { Eye, EyeClosed, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleSVG from "../../../../../public/google.svg";
import Image from "next/image";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ClerkAPIError } from "@clerk/types";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInSchema = z.infer<typeof SignInSchema>;

const Page = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInSchema>({
    resolver: zodResolver(SignInSchema),
  });
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [error, setError] = React.useState<ClerkAPIError[]>();

  const onSubmit = async (data: SignInSchema) => {
    if (!signIn || !setActive) return null;
    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) setError(err.errors);
      console.log(err);
    }
  };

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
      if (isClerkAPIResponseError(error)) setError(error.errors);
      console.error("Google OAuth error:", err);
    }
  };

  console.log(error);

  return (
    <AuthLayout>
      <section className="flex flex-col justify-center items-center w-full bg-dot-black/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent>
              {error && error.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error.map((errItem, index) => (
                      <p key={index}>
                        {errItem.longMessage || errItem.message}
                      </p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid w-full gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="email"
                      placeholder="john@example.com"
                      type="email"
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
                      placeholder="•••••••"
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
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 mt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-mono text-white bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 animate-shine"
                style={{
                  backgroundSize: "200% 200%",
                  backgroundPosition: "0% 50%",
                }}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>

              <div className="relative w-full flex items-center justify-center text-sm text-gray-500">
                <div className="flex-grow border-t border-gray-300" />
                <span className="px-3">or</span>
                <div className="flex-grow border-t border-gray-300" />
              </div>

              {/*<Button variant="outline" className="w-full">*/}
              <div
                className="flex gap-2 items-center justify-center border w-full px-4 py-2 rounded cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => handleGoogleSignIn()}
              >
                <Image
                  src={GoogleSVG}
                  alt="Google logo"
                  width={20}
                  height={20}
                />
                Google
              </div>
              {/*</Button>*/}

              <div className="text-center text-sm">
                <span>Don't have an account? </span>
                <Link href="/sign-up" className="text-blue-500">
                  Sign Up
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
          </form>
        </Card>
      </section>
    </AuthLayout>
  );
};

export default Page;

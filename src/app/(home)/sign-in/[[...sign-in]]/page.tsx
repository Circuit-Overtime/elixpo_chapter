"use client";

import AuthLayout from "@/components/AuthLayout";
import { SignIn } from "@clerk/nextjs";
import React from "react";

const SignInPage = () => {
  return (
    <AuthLayout>
        <section className="flex justify-center items-center h-screen bg-dot-black/[0.4]">
      <SignIn
        appearance={{
            elements:{
                 cardBox: 'bg-black'
            }
        }}
    
      />
    </section>
    </AuthLayout>
  );
};

export default SignInPage;

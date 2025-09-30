import {useAuthActions} from "@convex-dev/auth/react"
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod"
import {zodResolver} from "@hookform/resolvers/zod"
import { useRouter } from "next/router";
import { toast } from "sonner";


const signInSchema = z.object({
     email: z.string().email("Invalid email"),
     password: z.string().min(8,"Password must be alteast 8 characters")
})

const signUpSchema = z.object({ 
     firstname: z.string().min(6,"first name should have 6 characters"),
     lastname: z.string().min(2, "should have alteast 2 characters"),
     email: z.string().email("Email is required"),
     password: z.string().min(8,"Password must be atleast 8 characters")
})

type SignInData = z.infer<typeof signInSchema>
type SignUpData = z.infer<typeof signUpSchema>
export const UseAuth = ()  => {
     const router = useRouter();
     const {signIn, signOut} = useAuthActions();
     const [isLoading,setIsLoading] = useState(false);
     const signInForm = useForm<SignInData>({
         resolver: zodResolver(signInSchema),
         defaultValues: {
             email: "",
             password: ""
         }
     })
     const signUpform = useForm<SignUpData>({
         resolver: zodResolver(signUpSchema),
         defaultValues: {
             firstname: "",
             lastname: "",
             email: "",
             password: ""
         }
     })


     const handleSignIn = async (data: SignInData) => {
         setIsLoading(true)
         try {
           await signIn("password",{
             email: data.email,
             password: data.password
           })
           router.push("/dashboard");
           toast.success("welcome back");

         } catch (error) {
           console.log(error);
           signInForm.setError("password",{
             message: "Invailde credentials"
           })
         }
         setIsLoading(false)
     }

     const handleSignOut = async () => {
         setIsLoading(true)
         await signOut()
         setIsLoading(false)
     }

     const handleSignUp = async (data: SignUpData) => {
        setIsLoading(true)

         setIsLoading(false)
     }

     return {
        
         handleSignIn,
         handleSignUp,
         handleSignOut,
         signInForm,
         signUpform,
         isLoading
     }

}
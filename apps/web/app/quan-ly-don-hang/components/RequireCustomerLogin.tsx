"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useCustomerToken } from "../../lib/use-customer-token";

type RequireCustomerLoginProps = {
  children: ReactNode;
};

export default function RequireCustomerLogin({ children }: RequireCustomerLoginProps) {
  const token = useCustomerToken();
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/");
    }
  }, [ready, token, router]);

  if (!ready || !token) {
    return null;
  }

  return <>{children}</>;
}

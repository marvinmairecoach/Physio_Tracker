"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/components/layout/providers"

export function useAuth() {
  return useSession()
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

export function useApi() {
  const fetchWithAuth = async (url: string, options: FetchOptions = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`)
    }

    return res.json()
  }

  return { fetch: fetchWithAuth }
}
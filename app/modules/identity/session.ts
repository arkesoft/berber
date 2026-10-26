import { useQuery } from "@tanstack/react-query";
import { session } from "../../contracts/schemas";
import { request, setSessionTokens } from "../../shared/api/http";
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      const data = await request("/session", session, { signal });
      setSessionTokens(data.csrfToken);
      return data;
    },
    staleTime: Infinity,
  });
}

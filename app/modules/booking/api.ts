import { useQuery } from "@tanstack/react-query";
import { catalog, availability } from "../../contracts/schemas";
import { request } from "../../shared/api/http";
export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: ({ signal }) => request("/catalog", catalog, { signal }),
  });
}
export function useAvailability(
  serviceId: string,
  staffId: string,
  date: string,
) {
  return useQuery({
    queryKey: ["availability", serviceId, staffId, date],
    queryFn: ({ signal }) =>
      request(
        `/availability?${new URLSearchParams({ serviceId, staffId, date })}`,
        availability,
        { signal },
      ),
    enabled: Boolean(serviceId && staffId && date),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

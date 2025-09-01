import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from 'react-query';
import { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { AppState } from '../store/appStore';
import toast from 'react-hot-toast';

// Types
export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Error Class
export class ApiException extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

// Enhanced API Query Hook
interface UseApiQueryOptions<TData, TError = ApiError> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: (string | number | boolean | undefined | null)[];
  queryFn: () => Promise<TData>;
  showErrorToast?: boolean;
  errorMessage?: string;
  retries?: number;
  retryDelay?: number;
}

export function useApiQuery<TData = unknown, TError = ApiError>({
  queryKey,
  queryFn,
  showErrorToast = true,
  errorMessage,
  retries = 3,
  retryDelay = 1000,
  onError,
  ...options
}: UseApiQueryOptions<TData, TError>) {
  const setError = useAppStore((state) => state.setError);
  
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    retry: (failureCount, error) => {
      // Don't retry for client errors (4xx)
      if (error instanceof ApiException && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < retries;
    },
    retryDelay: (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
    onError: (error) => {
      console.error('API Query Error:', error);
      
      // Set error in store
      const errorKey = String(queryKey[0]) as any;
      if (errorKey) {
        setError(errorKey, error instanceof Error ? error.message : 'An unknown error occurred');
      }
      
      // Show error toast
      if (showErrorToast) {
        const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
        toast.error(message);
      }
      
      onError?.(error);
    },
    ...options,
  });
}

// Enhanced Mutation Hook
interface UseApiMutationOptions<TData, TError = ApiError, TVariables = void> extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: (string | number)[][];
  optimisticUpdate?: {
    queryKey: (string | number)[];
    updateFn: (oldData: any, variables: TVariables) => any;
  };
}

export function useApiMutation<TData = unknown, TError = ApiError, TVariables = void>({
  mutationFn,
  showSuccessToast = true,
  showErrorToast = true,
  successMessage,
  errorMessage,
  invalidateQueries = [],
  optimisticUpdate,
  onSuccess,
  onError,
  onSettled,
  ...options
}: UseApiMutationOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient();
  const setError = useAppStore((state) => state.setError);

  return useMutation<TData, TError, TVariables>({
    mutationFn,
  onMutate: async (variables) => {
      // Optimistic update
      if (optimisticUpdate) {
        await queryClient.cancelQueries(optimisticUpdate.queryKey);
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        
        queryClient.setQueryData(
          optimisticUpdate.queryKey,
          (oldData: any) => optimisticUpdate.updateFn(oldData, variables)
        );
        
        return { previousData } as any;
      }
      
      return options.onMutate?.(variables) as any;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries(queryKey);
      });

      // Show success toast
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error('API Mutation Error:', error);

      // Rollback optimistic update
      if (optimisticUpdate && context?.previousData) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData);
      }

      // Set error in store
      setError('user', error instanceof Error ? error.message : 'An unknown error occurred');

      // Show error toast
      if (showErrorToast) {
        const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
        toast.error(message);
      }

      onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate queries on settlement (success or error)
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries(queryKey);
      });

      onSettled?.(data, error, variables, context);
    },
    ...options,
  });
}

// Paginated Query Hook
interface UsePaginatedQueryOptions<TData> extends Omit<UseApiQueryOptions<PaginatedResponse<TData>>, 'queryKey' | 'queryFn'> {
  baseQueryKey: (string | number)[];
  queryFn: (page: number, limit: number) => Promise<PaginatedResponse<TData>>;
  initialPage?: number;
  pageSize?: number;
}

export function usePaginatedQuery<TData = unknown>({
  baseQueryKey,
  queryFn,
  initialPage = 1,
  pageSize = 10,
  ...options
}: UsePaginatedQueryOptions<TData>) {
  const [page, setPage] = useState(initialPage);
  
  const queryKey = [...baseQueryKey, 'paginated', page, pageSize];
  
  const query = useApiQuery({
    queryKey,
    queryFn: () => queryFn(page, pageSize),
    keepPreviousData: true, // Keep previous page data while loading new page
    ...options,
  });

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const nextPage = useCallback(() => {
    if (query.data?.pagination.hasNext) {
      setPage((prev) => prev + 1);
    }
  }, [query.data?.pagination.hasNext]);

  const previousPage = useCallback(() => {
    if (query.data?.pagination.hasPrev) {
      setPage((prev) => prev - 1);
    }
  }, [query.data?.pagination.hasPrev]);

  const resetToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    ...query,
    page,
    goToPage,
    nextPage,
    previousPage,
    resetToFirstPage,
    pagination: query.data?.pagination,
    items: query.data?.data || [],
  };
}

// Infinite Query Hook
interface UseInfiniteQueryOptions<TData> extends Omit<UseApiQueryOptions<PaginatedResponse<TData>>, 'queryKey' | 'queryFn'> {
  baseQueryKey: (string | number)[];
  queryFn: (page: number, limit: number) => Promise<PaginatedResponse<TData>>;
  pageSize?: number;
}

export function useInfiniteQuery<TData = unknown>({
  baseQueryKey,
  queryFn,
  pageSize = 20,
  ...options
}: UseInfiniteQueryOptions<TData>) {
  const queryClient = useQueryClient();
  const queryKey = [...baseQueryKey, 'infinite', pageSize];

  const [allItems, setAllItems] = useState<TData[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query = useApiQuery({
    queryKey: [...queryKey, page],
    queryFn: () => queryFn(page, pageSize),
    onSuccess: (data) => {
      if (page === 1) {
        setAllItems(data.data);
      } else {
        setAllItems((prev) => [...prev, ...data.data]);
      }
      setHasNextPage(data.pagination.hasNext);
      setIsLoadingMore(false);
    },
    ...options,
  });

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore || query.isLoading) return;
    
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [hasNextPage, isLoadingMore, query.isLoading]);

  const reset = useCallback(() => {
    setPage(1);
    setAllItems([]);
    setHasNextPage(true);
    queryClient.invalidateQueries(queryKey);
  }, [queryClient, queryKey]);

  return {
    ...query,
    items: allItems,
    loadMore,
    hasNextPage,
    isLoadingMore,
    reset,
  };
}

// Prefetch Hook
export function usePrefetchQuery() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    <TData = unknown>(
      queryKey: (string | number)[],
      queryFn: () => Promise<TData>,
      options?: {
        staleTime?: number;
        cacheTime?: number;
      }
    ) => {
      queryClient.prefetchQuery(queryKey, queryFn, {
        staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
        cacheTime: options?.cacheTime || 10 * 60 * 1000, // 10 minutes
      });
    },
    [queryClient]
  );

  return { prefetch };
}

// Cache Management Hook
export function useQueryCache() {
  const queryClient = useQueryClient();

  const invalidateQueries = useCallback(
    (queryKey: (string | number)[]) => {
      queryClient.invalidateQueries(queryKey);
    },
    [queryClient]
  );

  const removeQueries = useCallback(
    (queryKey: (string | number)[]) => {
      queryClient.removeQueries(queryKey);
    },
    [queryClient]
  );

  const setQueryData = useCallback(
    <TData>(queryKey: (string | number)[], data: TData) => {
      queryClient.setQueryData(queryKey, data);
    },
    [queryClient]
  );

  const getQueryData = useCallback(
    <TData>(queryKey: (string | number)[]): TData | undefined => {
      return queryClient.getQueryData<TData>(queryKey);
    },
    [queryClient]
  );

  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  return {
    invalidateQueries,
    removeQueries,
    setQueryData,
    getQueryData,
    clearCache,
  };
}

// WebSocket Integration Hook
export function useWebSocketQuery<TData = unknown>(
  queryKey: (string | number)[],
  websocketUrl: string,
  options?: UseApiQueryOptions<TData>
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Create WebSocket connection
  const connect = useCallback(() => {
    const ws = new WebSocket(websocketUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.setQueryData(queryKey, data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    return ws;
  }, [websocketUrl, queryClient, queryKey]);

  return {
    isConnected,
    connect,
  };
}
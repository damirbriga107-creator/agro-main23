# DaorsAgro - Frontend Development Specifications

## Frontend Architecture Overview

**DaorsAgro Frontend** consists of a Progressive Web App (PWA) built with React and a mobile application built with React Native. Both share common components and utilities through a monorepo structure with modern tooling and best practices.

---

## Technology Stack

### Core Technologies
- **Web Framework**: React 18+ with TypeScript 5+
- **Mobile Framework**: React Native 0.73+ with TypeScript
- **Build Tools**: Vite (Web), Metro (React Native)
- **State Management**: Redux Toolkit + React Query (TanStack Query)
- **Form Management**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS (Web), NativeWind (React Native)
- **UI Components**: Headless UI + Custom Design System

### Development Tools
- **Testing**: Vitest, React Testing Library, Detox (E2E)
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Bundle Analysis**: Bundle analyzer, Source map explorer

---

## Project Structure

```
frontend/
├── packages/
│   ├── web-app/              # React PWA
│   │   ├── src/
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── mobile-app/           # React Native
│   │   ├── src/
│   │   ├── android/
│   │   ├── ios/
│   │   ├── metro.config.js
│   │   └── package.json
│   ├── shared/               # Shared components and utilities
│   │   ├── components/       # Common UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── store/           # Redux store
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── design-system/        # Design system package
├── tools/                    # Build and development tools
├── docs/                     # Frontend documentation
└── package.json              # Root package.json (workspace)
```

---

## Web Application (React PWA)

### Core Features
- **Progressive Web App**: Service worker, offline support, installable
- **Responsive Design**: Desktop, tablet, and mobile optimized
- **Real-time Updates**: WebSocket integration for live data
- **Offline Functionality**: Cache-first strategy for critical features
- **Performance**: Code splitting, lazy loading, image optimization

### Component Architecture
```typescript
// Component structure example
interface DashboardProps {
  farmId: string;
  dateRange: DateRange;
}

const Dashboard: React.FC<DashboardProps> = ({ farmId, dateRange }) => {
  const { data: financialData, isLoading } = useFinancialData(farmId, dateRange);
  const { data: cropData } = useCropData(farmId);
  
  return (
    <DashboardLayout>
      <DashboardHeader title="Farm Overview" />
      <Grid cols={3} gap={6}>
        <FinancialSummary data={financialData} loading={isLoading} />
        <CropStatus crops={cropData} />
        <WeatherWidget farmId={farmId} />
      </Grid>
    </DashboardLayout>
  );
};
```

### Main Application Modules

#### 1. Authentication Module
```typescript
// Login component
const LoginForm: React.FC = () => {
  const { mutate: login, isLoading } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginData) => {
    login(data, {
      onSuccess: (response) => {
        // Handle successful login
        navigate('/dashboard');
      },
      onError: (error) => {
        // Handle login error
        toast.error(error.message);
      }
    });
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo className="h-8 w-auto mx-auto" />
          <CardTitle>Sign In to DaorsAgro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              {...register('email')}
              type="email"
              placeholder="Enter your email"
              error={errors.email?.message}
            />
            <FormField
              {...register('password')}
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
            />
            <Button 
              type="submit" 
              className="w-full" 
              loading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
```

#### 2. Financial Management Module
```typescript
// Financial dashboard component
const FinancialDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const { data: transactions } = useTransactions({ dateRange });
  const { data: analytics } = useFinancialAnalytics({ dateRange });

  return (
    <PageLayout title="Financial Management">
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/transactions/new')}>
                Add Transaction
              </Button>
              <Button variant="outline" onClick={() => navigate('/reports')}>
                Generate Report
              </Button>
              <Button variant="outline" onClick={() => navigate('/budgets')}>
                Manage Budgets
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={analytics?.totalRevenue}
            change={analytics?.revenueChange}
            icon={<TrendingUpIcon />}
          />
          <MetricCard
            title="Total Expenses"
            value={analytics?.totalExpenses}
            change={analytics?.expenseChange}
            icon={<TrendingDownIcon />}
          />
          <MetricCard
            title="Net Profit"
            value={analytics?.netProfit}
            change={analytics?.profitChange}
            icon={<DollarSignIcon />}
          />
          <MetricCard
            title="Cash Flow"
            value={analytics?.cashFlow}
            change={analytics?.cashFlowChange}
            icon={<WalletIcon />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialChart data={analytics?.chartData} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseBreakdownChart data={analytics?.expenseBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable 
              transactions={transactions?.data || []} 
              onEdit={(id) => navigate(`/transactions/${id}/edit`)}
              onDelete={(id) => handleDeleteTransaction(id)}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
```

#### 3. Subsidy Management Module
```typescript
// Subsidy application component
const SubsidyApplication: React.FC = () => {
  const { id } = useParams();
  const { data: program } = useSubsidyProgram(id);
  const { mutate: submitApplication } = useSubmitSubsidyApplication();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SubsidyApplicationData>({
    resolver: zodResolver(subsidyApplicationSchema)
  });

  const onSubmit = (data: SubsidyApplicationData) => {
    submitApplication({ programId: id!, applicationData: data });
  };

  return (
    <PageLayout title={`Apply for ${program?.name}`}>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>
              Please fill out all required information accurately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal Information */}
              <FormSection title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    {...register('personalInfo.firstName')}
                    label="First Name"
                    error={errors.personalInfo?.firstName?.message}
                  />
                  <FormField
                    {...register('personalInfo.lastName')}
                    label="Last Name"
                    error={errors.personalInfo?.lastName?.message}
                  />
                </div>
              </FormSection>

              {/* Farm Information */}
              <FormSection title="Farm Information">
                <div className="space-y-4">
                  <FormField
                    {...register('farmInfo.totalAcres')}
                    label="Total Farm Acres"
                    type="number"
                    error={errors.farmInfo?.totalAcres?.message}
                  />
                  <FormField
                    {...register('farmInfo.cropTypes')}
                    label="Primary Crop Types"
                    as={MultiSelect}
                    options={cropTypeOptions}
                    error={errors.farmInfo?.cropTypes?.message}
                  />
                </div>
              </FormSection>

              {/* Document Upload */}
              <FormSection title="Required Documents">
                <DocumentUpload
                  requiredDocuments={program?.requiredDocuments || []}
                  onUpload={(documents) => setValue('documents', documents)}
                />
              </FormSection>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => navigate('/subsidies')}>
                  Cancel
                </Button>
                <Button type="submit">
                  Submit Application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
```

#### 4. Insurance Comparison Module
```typescript
// Insurance comparison component
const InsuranceComparison: React.FC = () => {
  const [filters, setFilters] = useState<InsuranceFilters>({});
  const { data: quotes } = useInsuranceQuotes(filters);
  const { mutate: requestQuote } = useRequestQuote();

  return (
    <PageLayout title="Insurance Comparison">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Find Insurance Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <InsuranceFilters
              filters={filters}
              onChange={setFilters}
            />
          </CardContent>
        </Card>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <InsuranceComparisonTable
              quotes={quotes || []}
              onRequestQuote={(providerId) => requestQuote({ 
                providerId, 
                farmData: filters 
              })}
            />
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskAssessmentWidget farmId={filters.farmId} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};
```

### PWA Configuration
```typescript
// vite.config.ts PWA configuration
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.daorsagro\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?${Date.now()}`;
              },
            },
          },
        ],
      },
      manifest: {
        name: 'DaorsAgro',
        short_name: 'DaorsAgro',
        description: 'Agricultural Financial Management Platform',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
```

---

## Mobile Application (React Native)

### Core Features
- **Native Performance**: Platform-specific optimizations
- **Offline Support**: Local data synchronization
- **Push Notifications**: Real-time alerts and reminders
- **Camera Integration**: Receipt scanning and document capture
- **GPS Integration**: Location-based features
- **Biometric Authentication**: Fingerprint and Face ID

### Navigation Structure
```typescript
// Navigation configuration
const AppNavigator: React.FC = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          // Auth Stack
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </Stack.Group>
        ) : (
          // Main App Stack
          <Stack.Group>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="TransactionForm" 
              component={TransactionFormScreen}
              options={{ title: 'Add Transaction' }}
            />
            <Stack.Screen 
              name="DocumentScanner" 
              component={DocumentScannerScreen}
              options={{ title: 'Scan Receipt' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Tab Navigator
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <WalletIcon color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Subsidies" 
        component={SubsidiesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <DocumentIcon color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MoreIcon color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
};
```

### Mobile-Specific Components
```typescript
// Receipt scanner component
const ReceiptScanner: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: BarCodeScanningResult) => {
    setScanned(true);
    // Process scanned data
    processReceiptData(data);
  };

  if (hasPermission === null) {
    return <LoadingScreen />;
  }

  if (hasPermission === false) {
    return <PermissionDeniedScreen />;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={CameraType.back}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      {scanned && (
        <View style={styles.overlay}>
          <Button 
            title="Tap to scan again" 
            onPress={() => setScanned(false)} 
          />
        </View>
      )}
    </View>
  );
};
```

---

## State Management

### Redux Store Configuration
```typescript
// Store configuration
const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    financial: financialSlice.reducer,
    subsidies: subsidySlice.reducer,
    insurance: insuranceSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      persistMiddleware,
      authMiddleware,
      apiMiddleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Auth Slice Example
```typescript
// Auth slice
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
    },
  },
});
```

### React Query Configuration
```typescript
// API service configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error instanceof APIError && error.status === 401) {
          return false; // Don't retry auth errors
        }
        return failureCount < 3;
      },
    },
  },
});

// Custom hooks for API calls
export const useTransactions = (filters: TransactionFilters) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.transactions.getAll(filters),
    enabled: !!filters.farmId,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.transactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] });
    },
  });
};
```

---

## Design System

### Component Library Structure
```typescript
// Button component example
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-600',
    outline: 'border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-600',
    ghost: 'text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-600',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
};
```

### Theme Configuration
```typescript
// Theme configuration
export const theme = {
  colors: {
    primary: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      900: '#14532d',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827',
    },
    error: {
      500: '#ef4444',
      600: '#dc2626',
    },
    warning: {
      500: '#f59e0b',
      600: '#d97706',
    },
    success: {
      500: '#10b981',
      600: '#059669',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
  },
};
```

---

## Performance Optimization

### Code Splitting Strategy
```typescript
// Lazy loading routes
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Transactions = lazy(() => import('../pages/Transactions'));
const Subsidies = lazy(() => import('../pages/Subsidies'));

// Route configuration with suspense
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/subsidies" element={<ProtectedRoute><Subsidies /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
```

### Image Optimization
```typescript
// Optimized image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoaded(true);
  const handleError = () => setError(true);

  return (
    <div className="relative overflow-hidden">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-500">Image failed to load</span>
        </div>
      )}
    </div>
  );
};
```

---

## Testing Strategy

### Component Testing
```typescript
// Component test example
describe('FinancialDashboard', () => {
  const mockTransactions = [
    { id: '1', amount: 1000, type: 'income', description: 'Crop sale' },
    { id: '2', amount: 500, type: 'expense', description: 'Seeds' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays financial summary correctly', async () => {
    // Mock API response
    (api.transactions.getAll as jest.Mock).mockResolvedValue({
      data: mockTransactions,
      total: 2,
    });

    render(
      <QueryClient client={queryClient}>
        <MemoryRouter>
          <FinancialDashboard />
        </MemoryRouter>
      </QueryClient>
    );

    expect(screen.getByText('Financial Management')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    });

    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    (api.transactions.getAll as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(
      <QueryClient client={queryClient}>
        <MemoryRouter>
          <FinancialDashboard />
        </MemoryRouter>
      </QueryClient>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### Integration Testing
```typescript
// Integration test example
describe('Transaction Flow', () => {
  it('allows user to create a new transaction', async () => {
    const user = userEvent.setup();

    render(<App />);

    // Navigate to transactions
    await user.click(screen.getByText('Transactions'));
    
    // Click add transaction button
    await user.click(screen.getByText('Add Transaction'));

    // Fill out form
    await user.type(screen.getByLabelText('Amount'), '150.00');
    await user.selectOptions(screen.getByLabelText('Type'), 'expense');
    await user.type(screen.getByLabelText('Description'), 'Fertilizer');

    // Submit form
    await user.click(screen.getByText('Save Transaction'));

    // Verify transaction appears in list
    await waitFor(() => {
      expect(screen.getByText('Fertilizer')).toBeInTheDocument();
    });
  });
});
```

This frontend specification provides a comprehensive guide for building a modern, performant, and user-friendly agricultural financial management platform that works seamlessly across web and mobile devices.
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'FARMER' | 'ADMIN' | 'ADVISOR';
  avatar?: string;
  farms: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  weatherAlerts: boolean;
  priceAlerts: boolean;
  maintenanceReminders: boolean;
}

export interface Farm {
  id: string;
  name: string;
  location: {
    address: string;
    coordinates: [number, number];
  };
  size: number;
  sizeUnit: 'acres' | 'hectares';
  crops: Crop[];
  owner: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Crop {
  id: string;
  name: string;
  variety: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  area: number;
  status: 'planted' | 'growing' | 'harvested' | 'sold';
  financials: CropFinancials;
  iotDevices: string[];
}

export interface CropFinancials {
  expenses: Expense[];
  revenues: Revenue[];
  budget: Budget;
  profitability: ProfitabilityMetrics;
}

export interface Expense {
  id: string;
  category: 'seeds' | 'fertilizers' | 'pesticides' | 'labor' | 'equipment' | 'fuel' | 'other';
  amount: number;
  date: string;
  description: string;
  supplier?: string;
  receiptUrl?: string;
}

export interface Revenue {
  id: string;
  source: 'crop_sale' | 'subsidy' | 'insurance' | 'other';
  amount: number;
  date: string;
  description: string;
  buyer?: string;
  quantity?: number;
  pricePerUnit?: number;
}

export interface Budget {
  totalBudget: number;
  allocated: Record<string, number>;
  spent: Record<string, number>;
  remaining: Record<string, number>;
}

export interface ProfitabilityMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    precipitation: number;
    condition: string;
    icon: string;
  }>;
  alerts: Array<{
    type: 'storm' | 'frost' | 'drought' | 'flood';
    severity: 'low' | 'medium' | 'high';
    message: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: 'weather_station' | 'soil_sensor' | 'irrigation_controller' | 'camera';
  status: 'online' | 'offline' | 'error';
  batteryLevel?: number;
  lastReading?: string;
  location: {
    farmId: string;
    coordinates: [number, number];
  };
  data: Record<string, any>;
}

// Store State Interface
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Farms state
  farms: Farm[];
  selectedFarmId: string | null;
  
  // UI state
  sidebarOpen: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
  
  // Data state
  weatherData: WeatherData | null;
  iotDevices: IoTDevice[];
  
  // Loading states
  loading: {
    user: boolean;
    farms: boolean;
    weather: boolean;
    devices: boolean;
  };
  
  // Error states
  errors: {
    user: string | null;
    farms: string | null;
    weather: string | null;
    devices: string | null;
  };
}

// Store Actions Interface
interface AppActions {
  // User actions
  setUser: (user: User) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  logout: () => void;
  
  // Farm actions
  setFarms: (farms: Farm[]) => void;
  addFarm: (farm: Farm) => void;
  updateFarm: (farmId: string, updates: Partial<Farm>) => void;
  removeFarm: (farmId: string) => void;
  selectFarm: (farmId: string) => void;
  
  // Crop actions
  addCrop: (farmId: string, crop: Crop) => void;
  updateCrop: (farmId: string, cropId: string, updates: Partial<Crop>) => void;
  removeCrop: (farmId: string, cropId: string) => void;
  
  // Financial actions
  addExpense: (farmId: string, cropId: string, expense: Expense) => void;
  addRevenue: (farmId: string, cropId: string, revenue: Revenue) => void;
  updateBudget: (farmId: string, cropId: string, budget: Partial<Budget>) => void;
  
  // UI actions
  setSidebarOpen: (open: boolean) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & { read?: boolean }) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  
  // Weather actions
  setWeatherData: (data: WeatherData) => void;
  
  // IoT actions
  setIoTDevices: (devices: IoTDevice[]) => void;
  updateIoTDevice: (deviceId: string, updates: Partial<IoTDevice>) => void;
  
  // Loading actions
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  
  // Error actions
  setError: (key: keyof AppState['errors'], error: string | null) => void;
  clearErrors: () => void;
  
  // Computed getters
  getSelectedFarm: () => Farm | null;
  getFarmById: (id: string) => Farm | null;
  getCropsByFarm: (farmId: string) => Crop[];
  getTotalFarmValue: (farmId: string) => number;
  getOverallProfitability: () => ProfitabilityMetrics;
}

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  farms: [],
  selectedFarmId: null,
  sidebarOpen: false,
  notifications: [],
  unreadNotificationCount: 0,
  weatherData: null,
  iotDevices: [],
  loading: {
    user: false,
    farms: false,
    weather: false,
    devices: false,
  },
  errors: {
    user: null,
    farms: null,
    weather: null,
    devices: null,
  },
};

// Create the store with all middleware
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // User actions
          setUser: (user: User) =>
            set((state) => {
              state.user = user;
              state.isAuthenticated = true;
            }),
          
          updateUserPreferences: (preferences: Partial<UserPreferences>) =>
            set((state) => {
              if (state.user) {
                state.user.preferences = { ...state.user.preferences, ...preferences };
              }
            }),
          
          logout: () =>
            set((state) => {
              state.user = null;
              state.isAuthenticated = false;
              state.farms = [];
              state.selectedFarmId = null;
              state.notifications = [];
              state.unreadNotificationCount = 0;
            }),
          
          // Farm actions
          setFarms: (farms: Farm[]) =>
            set((state) => {
              state.farms = farms;
            }),
          
          addFarm: (farm: Farm) =>
            set((state) => {
              state.farms.push(farm);
            }),
          
          updateFarm: (farmId: string, updates: Partial<Farm>) =>
            set((state) => {
              const farmIndex = state.farms.findIndex((f: Farm) => f.id === farmId);
              if (farmIndex !== -1) {
                state.farms[farmIndex] = { ...state.farms[farmIndex], ...updates };
              }
            }),
          
          removeFarm: (farmId: string) =>
            set((state) => {
              state.farms = state.farms.filter((f: Farm) => f.id !== farmId);
              if (state.selectedFarmId === farmId) {
                state.selectedFarmId = null;
              }
            }),
          
          selectFarm: (farmId: string) =>
            set((state) => {
              state.selectedFarmId = farmId;
            }),
          
          // Crop actions
          addCrop: (farmId: string, crop: Crop) =>
            set((state) => {
              const farm = state.farms.find((f: Farm) => f.id === farmId);
              if (farm) {
                farm.crops.push(crop);
              }
            }),
          
          updateCrop: (farmId: string, cropId: string, updates: Partial<Crop>) =>
            set((state) => {
              const farm = state.farms.find((f: Farm) => f.id === farmId);
              if (farm) {
                const cropIndex = farm.crops.findIndex((c) => c.id === cropId);
                if (cropIndex !== -1) {
                  farm.crops[cropIndex] = { ...farm.crops[cropIndex], ...updates };
                }
              }
            }),
          
          removeCrop: (farmId: string, cropId: string) =>
            set((state) => {
              const farm = state.farms.find((f: Farm) => f.id === farmId);
              if (farm) {
                farm.crops = farm.crops.filter((c) => c.id !== cropId);
              }
            }),
          
          // Financial actions
          addExpense: (farmId: string, cropId: string, expense: Expense) =>
            set((state) => {
              const farm = state.farms.find((f: Farm) => f.id === farmId);
              const crop = farm?.crops.find((c) => c.id === cropId);
              if (crop) {
                crop.financials.expenses.push(expense);
                // Recalculate profitability metrics
                const totalExpenses = crop.financials.expenses.reduce((sum, e) => sum + e.amount, 0);
                const totalRevenue = crop.financials.revenues.reduce((sum, r) => sum + r.amount, 0);
                crop.financials.profitability.totalExpenses = totalExpenses;
                crop.financials.profitability.netProfit = totalRevenue - totalExpenses;
                crop.financials.profitability.profitMargin = totalRevenue > 0 ? (crop.financials.profitability.netProfit / totalRevenue) * 100 : 0;
              }
            }),
          
          addRevenue: (farmId: string, cropId: string, revenue: Revenue) =>
            set((state) => {
              const farm = state.farms.find((f) => f.id === farmId);
              const crop = farm?.crops.find((c) => c.id === cropId);
              if (crop) {
                crop.financials.revenues.push(revenue);
                // Recalculate profitability metrics
                const totalRevenue = crop.financials.revenues.reduce((sum, r) => sum + r.amount, 0);
                const totalExpenses = crop.financials.expenses.reduce((sum, e) => sum + e.amount, 0);
                crop.financials.profitability.totalRevenue = totalRevenue;
                crop.financials.profitability.netProfit = totalRevenue - totalExpenses;
                crop.financials.profitability.profitMargin = totalRevenue > 0 ? (crop.financials.profitability.netProfit / totalRevenue) * 100 : 0;
              }
            }),
          
          updateBudget: (farmId: string, cropId: string, budget: Partial<Budget>) =>
            set((state) => {
              const farm = state.farms.find((f) => f.id === farmId);
              const crop = farm?.crops.find((c) => c.id === cropId);
              if (crop) {
                crop.financials.budget = { ...crop.financials.budget, ...budget };
              }
            }),
          
          // UI actions
          setSidebarOpen: (open: boolean) =>
            set((state) => {
              state.sidebarOpen = open;
            }),
          
          // Notification actions
          addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & { read?: boolean }) =>
            set((state) => {
              const newNotification: Notification = {
                ...notification,
                id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                read: notification.read ?? false,
              };
              state.notifications.unshift(newNotification);
              if (!newNotification.read) state.unreadNotificationCount += 1;
            }),
          
          markNotificationAsRead: (id: string) =>
            set((state) => {
              const notification = state.notifications.find((n) => n.id === id);
              if (notification && !notification.read) {
                notification.read = true;
                state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
              }
            }),
          
          markAllNotificationsAsRead: () =>
            set((state) => {
              state.notifications.forEach((n) => {
                n.read = true;
              });
              state.unreadNotificationCount = 0;
            }),
          
          removeNotification: (id: string) =>
            set((state) => {
              const notificationIndex = state.notifications.findIndex((n: Notification) => n.id === id);
              if (notificationIndex !== -1) {
                const notification = state.notifications[notificationIndex];
                if (!notification.read) {
                  state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
                }
                state.notifications.splice(notificationIndex, 1);
              }
            }),
          
          // Weather actions
          setWeatherData: (data: WeatherData) =>
            set((state) => {
              state.weatherData = data;
            }),
          
          // IoT actions
          setIoTDevices: (devices: IoTDevice[]) =>
            set((state) => {
              state.iotDevices = devices;
            }),
          
          updateIoTDevice: (deviceId: string, updates: Partial<IoTDevice>) =>
            set((state) => {
              const deviceIndex = state.iotDevices.findIndex((d: IoTDevice) => d.id === deviceId);
              if (deviceIndex !== -1) {
                state.iotDevices[deviceIndex] = { ...state.iotDevices[deviceIndex], ...updates };
              }
            }),
          
          // Loading actions
          setLoading: (key: keyof AppState['loading'], loading: boolean) =>
            set((state) => {
              state.loading[key] = loading;
            }),
          
          // Error actions
          setError: (key: keyof AppState['errors'], error: string | null) =>
            set((state) => {
              state.errors[key] = error;
            }),
          
          clearErrors: () =>
            set((state) => {
              Object.keys(state.errors).forEach((key) => {
                state.errors[key as keyof typeof state.errors] = null;
              });
            }),
          
          // Computed getters
          getSelectedFarm: () => {
            const state = get();
            return state.selectedFarmId ? state.farms.find((f: Farm) => f.id === state.selectedFarmId) || null : null;
          },
          
          getFarmById: (id: string) => {
            const state = get();
            return state.farms.find((f: Farm) => f.id === id) || null;
          },
          
          getCropsByFarm: (farmId: string) => {
            const state = get();
            const farm = state.farms.find((f: Farm) => f.id === farmId);
            return farm?.crops || [];
          },
          
          getTotalFarmValue: (farmId: string) => {
            const state = get();
            const farm = state.farms.find((f: Farm) => f.id === farmId);
            if (!farm) return 0;
            
            return farm.crops.reduce((total, crop) => {
              return total + crop.financials.profitability.netProfit;
            }, 0);
          },
          
          getOverallProfitability: () => {
            const state = get();
            const totals = state.farms.reduce(
              (acc, farm) => {
                farm.crops.forEach((crop) => {
                  acc.totalRevenue += crop.financials.profitability.totalRevenue;
                  acc.totalExpenses += crop.financials.profitability.totalExpenses;
                });
                return acc;
              },
              { totalRevenue: 0, totalExpenses: 0 }
            );
            
            const netProfit = totals.totalRevenue - totals.totalExpenses;
            const profitMargin = totals.totalRevenue > 0 ? (netProfit / totals.totalRevenue) * 100 : 0;
            const roi = totals.totalExpenses > 0 ? (netProfit / totals.totalExpenses) * 100 : 0;
            
            return {
              totalRevenue: totals.totalRevenue,
              totalExpenses: totals.totalExpenses,
              netProfit,
              profitMargin,
              roi,
            };
          },
        }))
      ),
      {
        name: 'daorsagro-app-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          selectedFarmId: state.selectedFarmId,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'DaorsAgro App Store',
    }
  )
);

// Selectors for performance optimization
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useFarms = () => useAppStore((state) => state.farms);
export const useSelectedFarm = () => useAppStore((state) => state.getSelectedFarm());
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadNotificationCount = () => useAppStore((state) => state.unreadNotificationCount);
export const useWeatherData = () => useAppStore((state) => state.weatherData);
export const useIoTDevices = () => useAppStore((state) => state.iotDevices);
export const useLoading = () => useAppStore((state) => state.loading);
export const useErrors = () => useAppStore((state) => state.errors);
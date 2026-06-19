import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { useRecipeTracker } from "./hooks/useRecipeTracker";
import { getUserState, saveUserState } from "./api";
import { getPathForRoute, getRouteFromPath, type Route } from "./lib/routing";
import { toDateKey, type MealPlan } from "./lib/planning";
import { supabase } from "./lib/supabase";
import { HomePage } from "./pages/HomePage";
import { IngredientsPage } from "./pages/IngredientsPage";
import { MealsPage } from "./pages/MealsPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { LandingPage } from "./pages/LandingPage";
import { CalendarPage } from "./pages/CalendarPage";
import { TdeePage } from "./pages/TdeePage";

type Theme = "light" | "dark";

const TDEE_TARGET_STORAGE_KEY = "recipe-tracker-current-tdee-target";
const PROTEIN_TARGET_STORAGE_KEY = "recipe-tracker-current-protein-target";
const MEAL_PLAN_STORAGE_KEY = "recipe-tracker-meal-plan";
const CALENDAR_SELECTED_DATE_STORAGE_KEY = "recipe-tracker-calendar-selected-date";
const ACCENT_COLOR_STORAGE_KEY = "recipe-tracker-accent-color";
const DEFAULT_ACCENT_COLOR = "#c72d74";

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem("recipe-tracker-theme");
  return savedTheme === "dark" ? "dark" : "light";
}

function getInitialAccentColor() {
  const savedColor = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
  return savedColor && /^#[0-9a-f]{6}$/i.test(savedColor) ? savedColor : DEFAULT_ACCENT_COLOR;
}

function mixHexColors(color: string, mixWith: string, amount: number) {
  const channel = (hex: string, offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) =>
    Math.round(channel(color, offset) * (1 - amount) + channel(mixWith, offset) * amount)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${mixed.join("")}`;
}

function getInitialTdeeTarget() {
  const savedTarget = Number(getStoredValue(TDEE_TARGET_STORAGE_KEY));
  return Number.isFinite(savedTarget) && savedTarget > 0 ? savedTarget : null;
}

function getInitialProteinTarget() {
  const savedTarget = Number(getStoredValue(PROTEIN_TARGET_STORAGE_KEY));
  return Number.isFinite(savedTarget) && savedTarget > 0 ? savedTarget : null;
}

function getInitialMealPlan(): MealPlan {
  try {
    const savedPlan = getStoredValue(MEAL_PLAN_STORAGE_KEY);
    return savedPlan ? (JSON.parse(savedPlan) as MealPlan) : {};
  } catch {
    return {};
  }
}

function getInitialCalendarSelectedDate() {
  const savedDate = window.localStorage.getItem(CALENDAR_SELECTED_DATE_STORAGE_KEY);
  const match = savedDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime()) && toDateKey(date) === savedDate) {
      return date;
    }
  }

  return new Date();
}

function getStorageKey(baseKey: string, userEmail?: string | null) {
  return userEmail ? `${baseKey}:${userEmail.toLowerCase()}` : baseKey;
}

function getStoredValue(baseKey: string, userEmail?: string | null) {
  return window.localStorage.getItem(getStorageKey(baseKey, userEmail)) || window.localStorage.getItem(baseKey);
}

function getLocalUserState(userEmail?: string | null) {
  const savedTdeeTarget = Number(getStoredValue(TDEE_TARGET_STORAGE_KEY, userEmail));
  const savedProteinTarget = Number(getStoredValue(PROTEIN_TARGET_STORAGE_KEY, userEmail));
  const savedPlan = getStoredValue(MEAL_PLAN_STORAGE_KEY, userEmail);

  try {
    return {
      tdeeTarget: Number.isFinite(savedTdeeTarget) && savedTdeeTarget > 0 ? savedTdeeTarget : null,
      proteinTarget: Number.isFinite(savedProteinTarget) && savedProteinTarget > 0 ? savedProteinTarget : null,
      mealPlan: savedPlan ? (JSON.parse(savedPlan) as MealPlan) : {}
    };
  } catch {
    return {
      tdeeTarget: Number.isFinite(savedTdeeTarget) && savedTdeeTarget > 0 ? savedTdeeTarget : null,
      proteinTarget: Number.isFinite(savedProteinTarget) && savedProteinTarget > 0 ? savedProteinTarget : null,
      mealPlan: {}
    };
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => getRouteFromPath(window.location.pathname));
  const routeRef = useRef(route);
  const scrollPositionsRef = useRef<Partial<Record<Route, number>>>({});
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColor] = useState(getInitialAccentColor);
  const [currentTdeeTarget, setCurrentTdeeTarget] = useState<number | null>(getInitialTdeeTarget);
  const [currentProteinTarget, setCurrentProteinTarget] = useState<number | null>(getInitialProteinTarget);
  const [mealPlan, setMealPlan] = useState<MealPlan>(getInitialMealPlan);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(getInitialCalendarSelectedDate);
  const [loadedStorageUser, setLoadedStorageUser] = useState<string | null>(null);
  const [isRemoteStateLoaded, setIsRemoteStateLoaded] = useState(false);
  const [remoteSyncRetry, setRemoteSyncRetry] = useState(0);
  const mealPlanRef = useRef(mealPlan);
  const lastSyncedMealPlanRef = useRef("");
  const remoteSaveCountRef = useRef(0);
  const auth = useAuth();

  useEffect(() => {
    window.localStorage.setItem(CALENDAR_SELECTED_DATE_STORAGE_KEY, toDateKey(calendarSelectedDate));
  }, [calendarSelectedDate]);

  useEffect(() => {
    mealPlanRef.current = mealPlan;
  }, [mealPlan]);

  function navigate(nextRoute: Route) {
    if (nextRoute === routeRef.current) {
      return;
    }

    scrollPositionsRef.current[routeRef.current] = window.scrollY;
    const nextPath = getPathForRoute(nextRoute);
    window.history.pushState(null, "", nextPath);
    routeRef.current = nextRoute;
    setRoute(nextRoute);
  }

  const tracker = useRecipeTracker((nextRoute) => navigate(nextRoute), auth.accessToken);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositionsRef.current[route] || 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [route]);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("recipe-tracker-theme", theme);
    window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColor);
    document.documentElement.style.setProperty("--green", accentColor);
    document.documentElement.style.setProperty("--green-dark", mixHexColors(accentColor, "#000000", 0.28));
    document.documentElement.style.setProperty(
      "--green-soft",
      mixHexColors(accentColor, theme === "dark" ? "#000000" : "#ffffff", theme === "dark" ? 0.68 : 0.86)
    );
    document.documentElement.style.setProperty("--mint", mixHexColors(accentColor, "#ffffff", 0.42));
  }, [accentColor, theme]);

  useEffect(() => {
    if (!auth.userEmail || !auth.accessToken) {
      setIsRemoteStateLoaded(false);
      return;
    }

    let isMounted = true;
    async function loadUserState() {
      setIsRemoteStateLoaded(false);
      try {
        const remoteState = await getUserState();
        if (!isMounted) {
          return;
        }
        const localState = getLocalUserState(auth.userEmail);
        const remoteIsEmpty =
          !remoteState.tdeeTarget &&
          !remoteState.proteinTarget &&
          Object.keys(remoteState.mealPlan || {}).length === 0;
        const nextMealPlan = remoteIsEmpty ? localState.mealPlan : remoteState.mealPlan || {};
        setCurrentTdeeTarget(remoteIsEmpty ? localState.tdeeTarget : remoteState.tdeeTarget);
        setCurrentProteinTarget(remoteIsEmpty ? localState.proteinTarget : remoteState.proteinTarget);
        lastSyncedMealPlanRef.current = JSON.stringify(nextMealPlan);
        setMealPlan(nextMealPlan);
      } catch {
        if (!isMounted) {
          return;
        }
        const localState = getLocalUserState(auth.userEmail);
        setCurrentTdeeTarget(localState.tdeeTarget);
        setCurrentProteinTarget(localState.proteinTarget);
        lastSyncedMealPlanRef.current = JSON.stringify(localState.mealPlan);
        setMealPlan(localState.mealPlan);
      } finally {
        if (isMounted) {
          setLoadedStorageUser(auth.userEmail);
          setIsRemoteStateLoaded(true);
        }
      }
    }

    void loadUserState();
    return () => {
      isMounted = false;
    };
  }, [auth.accessToken, auth.userEmail]);

  useEffect(() => {
    if (auth.userEmail && loadedStorageUser !== auth.userEmail) {
      return;
    }

    if (currentTdeeTarget) {
      window.localStorage.setItem(getStorageKey(TDEE_TARGET_STORAGE_KEY, auth.userEmail), String(currentTdeeTarget));
    }
  }, [auth.userEmail, currentTdeeTarget, loadedStorageUser]);

  useEffect(() => {
    if (auth.userEmail && loadedStorageUser !== auth.userEmail) {
      return;
    }

    if (currentProteinTarget) {
      window.localStorage.setItem(getStorageKey(PROTEIN_TARGET_STORAGE_KEY, auth.userEmail), String(currentProteinTarget));
    }
  }, [auth.userEmail, currentProteinTarget, loadedStorageUser]);

  useEffect(() => {
    if (auth.userEmail && loadedStorageUser !== auth.userEmail) {
      return;
    }

    window.localStorage.setItem(getStorageKey(MEAL_PLAN_STORAGE_KEY, auth.userEmail), JSON.stringify(mealPlan));
  }, [auth.userEmail, loadedStorageUser, mealPlan]);

  useEffect(() => {
    if (!auth.userEmail || !isRemoteStateLoaded) {
      return;
    }

    let isCurrentSave = true;
    let retryTimeoutId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      remoteSaveCountRef.current += 1;
      void saveUserState({ tdeeTarget: currentTdeeTarget, proteinTarget: currentProteinTarget, mealPlan })
        .then((savedState) => {
          if (isCurrentSave) {
            lastSyncedMealPlanRef.current = JSON.stringify(savedState.mealPlan || {});
          }
        })
        .catch((error) => {
          console.error("Could not sync the meal plan to the database", error);
          if (isCurrentSave) {
            retryTimeoutId = window.setTimeout(() => setRemoteSyncRetry((retry) => retry + 1), 3_000);
          }
        })
        .finally(() => {
          remoteSaveCountRef.current = Math.max(0, remoteSaveCountRef.current - 1);
        });
    }, 450);

    return () => {
      isCurrentSave = false;
      window.clearTimeout(timeoutId);
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }
    };
  }, [auth.userEmail, currentProteinTarget, currentTdeeTarget, isRemoteStateLoaded, mealPlan, remoteSyncRetry]);

  useEffect(() => {
    if (!auth.userEmail || !auth.accessToken || !isRemoteStateLoaded) {
      return;
    }

    let isMounted = true;

    async function refreshMealPlan() {
      if (document.visibilityState === "hidden" || remoteSaveCountRef.current > 0) {
        return;
      }

      const localPlan = JSON.stringify(mealPlanRef.current);
      if (localPlan !== lastSyncedMealPlanRef.current) {
        return;
      }

      try {
        const remoteState = await getUserState();
        if (!isMounted) {
          return;
        }

        const remotePlan = remoteState.mealPlan || {};
        const serializedRemotePlan = JSON.stringify(remotePlan);
        if (serializedRemotePlan !== lastSyncedMealPlanRef.current) {
          lastSyncedMealPlanRef.current = serializedRemotePlan;
          setMealPlan(remotePlan);
        }
      } catch (error) {
        console.error("Could not refresh the meal plan from the database", error);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshMealPlan();
      }
    }

    let realtimeRefreshTimeoutId: number | undefined;
    const intervalId = window.setInterval(() => void refreshMealPlan(), 15_000);
    const userId = auth.session?.user.id;
    const realtimeChannel = supabase && userId
      ? supabase
          .channel(`planned-meals-${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "planned_meals", filter: `user_id=eq.${userId}` },
            () => {
              window.clearTimeout(realtimeRefreshTimeoutId);
              realtimeRefreshTimeoutId = window.setTimeout(() => void refreshMealPlan(), 250);
            }
          )
          .subscribe()
      : null;
    window.addEventListener("focus", refreshMealPlan);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.clearTimeout(realtimeRefreshTimeoutId);
      if (realtimeChannel && supabase) {
        void supabase.removeChannel(realtimeChannel);
      }
      window.removeEventListener("focus", refreshMealPlan);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [auth.accessToken, auth.session?.user.id, auth.userEmail, isRemoteStateLoaded]);

  useEffect(() => {
    function handlePopState() {
      scrollPositionsRef.current[routeRef.current] = window.scrollY;
      const nextRoute = getRouteFromPath(window.location.pathname);
      routeRef.current = nextRoute;
      setRoute(nextRoute);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <>
      {auth.isAuthLoading ? (
        <div className="auth-loading-screen">
          <div className="brand">
            <span className="brand-mark">P</span>
            <strong>Plateful</strong>
          </div>
          <p className="muted">Restoring your session...</p>
        </div>
      ) : !auth.userEmail ? (
        <LandingPage
          authConfigured={auth.authConfigured}
          authConfigMessage={auth.authConfigMessage}
          isAuthLoading={auth.isAuthLoading}
          theme={theme}
          onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
          onSignIn={auth.signInWithGoogle}
        />
      ) : (
      <Layout
        route={route}
        health={tracker.health}
        theme={theme}
        accentColor={accentColor}
        authConfigured={auth.authConfigured}
        authConfigMessage={auth.authConfigMessage}
        isAuthLoading={auth.isAuthLoading}
        userEmail={auth.userEmail}
        userName={auth.userName}
        onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
        onAccentColorChange={setAccentColor}
        onNavigate={navigate}
        onSignIn={auth.signInWithGoogle}
        onSignOut={auth.signOut}
      >
        {route === "home" ? (
          <HomePage
            foods={tracker.foods}
            recipes={tracker.recipes}
            mealPlan={mealPlan}
            currentTdeeTarget={currentTdeeTarget}
            currentProteinTarget={currentProteinTarget}
            userName={auth.userName}
            onNavigate={navigate}
            onEditFood={tracker.editFood}
            onEditRecipe={tracker.editRecipe}
          />
        ) : null}

        {route === "ingredients" ? (
          <IngredientsPage
            foods={tracker.foods}
            recipes={tracker.recipes}
            foodForm={tracker.foodForm}
            isEditing={Boolean(tracker.editingFoodId)}
            editingFoodId={tracker.editingFoodId}
            isSaving={tracker.isSavingFood}
            message={tracker.message}
            onFoodChange={tracker.setFoodForm}
            onCaloriesChange={tracker.updateFoodCalories}
            onKjChange={tracker.updateFoodKj}
            onSubmit={tracker.saveFood}
            onCancel={tracker.resetFoodForm}
            onEdit={tracker.editFood}
            onDelete={tracker.removeFood}
            onDeleteWithReferences={tracker.removeFoodAndRecipeReferences}
            onBulkDelete={tracker.removeFoods}
          />
        ) : null}

        {route === "meals" ? (
          <MealsPage
            recipes={tracker.recipes}
            foods={tracker.foods}
            recipeForm={tracker.recipeForm}
            ingredientQueries={tracker.ingredientQueries}
            ingredientWeightTotal={tracker.ingredientWeightTotal}
            isEditing={Boolean(tracker.editingRecipeId)}
            editingRecipeId={tracker.editingRecipeId}
            isSaving={tracker.isSavingRecipe}
            message={tracker.recipeMessage}
            portionWeights={tracker.portionWeights}
            favoriteRecipeIds={tracker.favoriteRecipeIds}
            onPortionWeightsChange={tracker.setPortionWeights}
            onRecipeChange={tracker.setRecipeForm}
            onSubmit={tracker.saveRecipe}
            onCancel={tracker.resetRecipeForm}
            onManualWeightChange={tracker.setManualTotalWeight}
            onRegenerateWeight={tracker.regenerateTotalWeight}
            onIngredientQueryChange={tracker.updateIngredientQuery}
            onChooseIngredient={tracker.chooseIngredient}
            getIngredientMatches={tracker.getIngredientMatches}
            onIngredientWeightChange={(index, weight) => tracker.updateRecipeIngredient(index, { weight_g: weight })}
            onAddIngredient={tracker.addRecipeIngredient}
            onRemoveIngredient={tracker.removeRecipeIngredient}
            getPortionTotals={tracker.getPortionTotals}
            onEdit={tracker.editRecipe}
            onDelete={tracker.removeRecipe}
            onBulkDelete={tracker.removeRecipes}
            onFavoriteToggle={tracker.toggleFavoriteRecipe}
          />
        ) : null}

        {route === "favorites" ? (
          <FavoritesPage
            recipes={tracker.recipes}
            favoriteRecipeIds={tracker.favoriteRecipeIds}
            portionWeights={tracker.portionWeights}
            onPortionWeightsChange={tracker.setPortionWeights}
            getPortionTotals={tracker.getPortionTotals}
            onEdit={tracker.editRecipe}
            onFavoriteToggle={tracker.toggleFavoriteRecipe}
          />
        ) : null}

        {route === "calendar" ? (
          <CalendarPage
            recipes={tracker.recipes}
            favoriteRecipeIds={tracker.favoriteRecipeIds}
            mealPlan={mealPlan}
            currentTdeeTarget={currentTdeeTarget}
            selectedDate={calendarSelectedDate}
            onMealPlanChange={setMealPlan}
            onSelectedDateChange={setCalendarSelectedDate}
            onEditRecipe={tracker.editRecipe}
          />
        ) : null}

        {route === "tdee" ? (
          <TdeePage
            currentTarget={currentTdeeTarget}
            currentProteinTarget={currentProteinTarget}
            onSetCurrentTarget={setCurrentTdeeTarget}
            onSetCurrentProteinTarget={setCurrentProteinTarget}
          />
        ) : null}
      </Layout>
      )}
    </>
  );
}

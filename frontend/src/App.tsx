import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { useRecipeTracker } from "./hooks/useRecipeTracker";
import { getUserState, saveUserState } from "./api";
import { getPathForRoute, getRouteFromPath, type Route } from "./lib/routing";
import type { MealPlan } from "./lib/planning";
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

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem("recipe-tracker-theme");
  return savedTheme === "dark" ? "dark" : "light";
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
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [currentTdeeTarget, setCurrentTdeeTarget] = useState<number | null>(getInitialTdeeTarget);
  const [currentProteinTarget, setCurrentProteinTarget] = useState<number | null>(getInitialProteinTarget);
  const [mealPlan, setMealPlan] = useState<MealPlan>(getInitialMealPlan);
  const [loadedStorageUser, setLoadedStorageUser] = useState<string | null>(null);
  const [isRemoteStateLoaded, setIsRemoteStateLoaded] = useState(false);
  const auth = useAuth();

  function navigate(nextRoute: Route) {
    const nextPath = getPathForRoute(nextRoute);
    window.history.pushState(null, "", nextPath);
    setRoute(nextRoute);
  }

  const tracker = useRecipeTracker((nextRoute) => navigate(nextRoute), auth.accessToken);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("recipe-tracker-theme", theme);
  }, [theme]);

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
        setCurrentTdeeTarget(remoteIsEmpty ? localState.tdeeTarget : remoteState.tdeeTarget);
        setCurrentProteinTarget(remoteIsEmpty ? localState.proteinTarget : remoteState.proteinTarget);
        setMealPlan(remoteIsEmpty ? localState.mealPlan : remoteState.mealPlan || {});
      } catch {
        if (!isMounted) {
          return;
        }
        const localState = getLocalUserState(auth.userEmail);
        setCurrentTdeeTarget(localState.tdeeTarget);
        setCurrentProteinTarget(localState.proteinTarget);
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

    const timeoutId = window.setTimeout(() => {
      void saveUserState({
        tdeeTarget: currentTdeeTarget,
        proteinTarget: currentProteinTarget,
        mealPlan
      });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [auth.userEmail, currentProteinTarget, currentTdeeTarget, isRemoteStateLoaded, mealPlan]);

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteFromPath(window.location.pathname));
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
        authConfigured={auth.authConfigured}
        authConfigMessage={auth.authConfigMessage}
        isAuthLoading={auth.isAuthLoading}
        userEmail={auth.userEmail}
        userName={auth.userName}
        onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
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
            onMealPlanChange={setMealPlan}
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

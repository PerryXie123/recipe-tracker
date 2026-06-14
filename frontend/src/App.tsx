import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { useAuth } from "./hooks/useAuth";
import { useRecipeTracker } from "./hooks/useRecipeTracker";
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
const MEAL_PLAN_STORAGE_KEY = "recipe-tracker-meal-plan";

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem("recipe-tracker-theme");
  return savedTheme === "dark" ? "dark" : "light";
}

function getInitialTdeeTarget() {
  const savedTarget = Number(window.localStorage.getItem(TDEE_TARGET_STORAGE_KEY));
  return Number.isFinite(savedTarget) && savedTarget > 0 ? savedTarget : null;
}

function getInitialMealPlan(): MealPlan {
  try {
    const savedPlan = window.localStorage.getItem(MEAL_PLAN_STORAGE_KEY);
    return savedPlan ? (JSON.parse(savedPlan) as MealPlan) : {};
  } catch {
    return {};
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => getRouteFromPath(window.location.pathname));
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [currentTdeeTarget, setCurrentTdeeTarget] = useState<number | null>(getInitialTdeeTarget);
  const [mealPlan, setMealPlan] = useState<MealPlan>(getInitialMealPlan);
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
    if (currentTdeeTarget) {
      window.localStorage.setItem(TDEE_TARGET_STORAGE_KEY, String(currentTdeeTarget));
    }
  }, [currentTdeeTarget]);

  useEffect(() => {
    window.localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlan));
  }, [mealPlan]);

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <>
      {!auth.userEmail ? (
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
            userName={auth.userName}
            onNavigate={navigate}
            onEditFood={tracker.editFood}
            onEditRecipe={tracker.editRecipe}
          />
        ) : null}

        {route === "ingredients" ? (
          <IngredientsPage
            foods={tracker.foods}
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
          <TdeePage currentTarget={currentTdeeTarget} onSetCurrentTarget={setCurrentTdeeTarget} />
        ) : null}
      </Layout>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { Layout } from "./components/Layout";
import { useRecipeTracker } from "./hooks/useRecipeTracker";
import { getPathForRoute, getRouteFromPath, type Route } from "./lib/routing";
import { HomePage } from "./pages/HomePage";
import { IngredientsPage } from "./pages/IngredientsPage";
import { MealsPage } from "./pages/MealsPage";
import { FavoritesPage } from "./pages/FavoritesPage";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem("recipe-tracker-theme");
  return savedTheme === "dark" ? "dark" : "light";
}

export function App() {
  const [route, setRoute] = useState<Route>(() => getRouteFromPath(window.location.pathname));
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  function navigate(nextRoute: Route) {
    const nextPath = getPathForRoute(nextRoute);
    window.history.pushState(null, "", nextPath);
    setRoute(nextRoute);
  }

  const tracker = useRecipeTracker((nextRoute) => navigate(nextRoute));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("recipe-tracker-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <MantineProvider forceColorScheme={theme}>
      <Layout
        route={route}
        health={tracker.health}
        theme={theme}
        onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
        onNavigate={navigate}
      >
        {route === "home" ? (
          <HomePage
            foods={tracker.foods}
            recipes={tracker.recipes}
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
      </Layout>
    </MantineProvider>
  );
}

export type Food = {
  id: string;
  name: string;
  created_at?: string | null;
  calories_per_unit: number;
  kj_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  unit_weight_g: number;
  notes?: string | null;
};

export type Ingredient = {
  food_id: string;
  food_name: string;
  weight_g: number;
  calories: number;
  kj: number;
  protein: number;
};

export type Recipe = {
  id: string;
  name: string;
  category?: string | null;
  target_plan?: string | null;
  total_weight_g?: number | null;
  created_at?: string | null;
  calories: number;
  kj: number;
  protein: number;
  ingredients: Ingredient[];
};

export type Health = {
  ok: boolean;
  supabaseConfigured: boolean;
};

export type NewFood = {
  name: string;
  calories_per_unit: number;
  kj_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  unit_weight_g: number;
};

export type NewRecipe = {
  name: string;
  category: string;
  total_weight_g: number;
  ingredients: Array<{
    food_id: string;
    weight_g: number;
  }>;
};

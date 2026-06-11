export type Food = {
  id: string;
  name: string;
  calories_per_unit: number;
  kj_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  notes?: string | null;
};

export type Ingredient = {
  food_id: string;
  food_name: string;
  quantity: number;
  calories: number;
  kj: number;
  protein: number;
};

export type Recipe = {
  id: string;
  name: string;
  category?: string | null;
  target_plan?: string | null;
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
};

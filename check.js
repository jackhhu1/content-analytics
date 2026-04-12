const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from("posts").select("*").eq("is_outlier", true);
  console.log("Outliers count:", data ? data.length : "error", error);
  const { data: d2, error: e2 } = await supabase.from("posts").select("*");
  console.log("Total posts count:", d2 ? d2.length : "error", e2);
}
test();

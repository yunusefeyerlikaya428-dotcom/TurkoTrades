import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jxqjtxtyoknvaxwhdhpm.supabase.co";
const supabaseKey = "sb_publishable_tp-2bHkiOecQIbaE9-R6YA_MDuc1S1L";

export const supabase = createClient(supabaseUrl, supabaseKey);
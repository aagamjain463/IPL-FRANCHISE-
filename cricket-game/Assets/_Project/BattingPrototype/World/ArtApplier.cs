using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>
    /// Phase 5 art pass (spec section 2): applies the ORIGINAL generated
    /// textures (grass, pitch, crowd, ad boards, dusk sky) that live in
    /// Assets/_Project/Art/Resources/Textures. Loaded at runtime via
    /// Resources.Load and fully fallback-safe - if a texture is missing the
    /// flat-colour prototype materials remain, so nothing ever breaks.
    /// </summary>
    public static class ArtApplier
    {
        public static void Apply(Transform worldRoot)
        {
            Texture2D grass = Resources.Load<Texture2D>("Textures/outfield_grass");
            Texture2D pitch = Resources.Load<Texture2D>("Textures/pitch_tan");
            Texture2D crowd = Resources.Load<Texture2D>("Textures/crowd_dusk");
            Texture2D ads = Resources.Load<Texture2D>("Textures/adboards");
            Texture2D sky = Resources.Load<Texture2D>("Textures/sky_dusk");

            SetTexture(worldRoot.Find("Ground"), grass, new Vector2(12f, 12f));
            SetTexture(worldRoot.Find("PitchStrip"), pitch, new Vector2(2f, 14f));

            var stadium = worldRoot.Find("Stadium");
            if (stadium != null)
            {
                for (int i = 0; i < 24; i++)
                    SetTexture(stadium.Find("Stand" + i), crowd, new Vector2(4f, 2f));
                for (int i = 0; i < 30; i++)
                    SetTexture(stadium.Find("Board" + i), ads, new Vector2(2f, 1f));
                for (int i = 0; i < 12; i++)
                    SetTexture(stadium.Find("Tier2_" + i), crowd, new Vector2(5f, 2f));
            }

            if (sky != null) BuildSkyDome(worldRoot, sky);
        }

        private static void SetTexture(Transform t, Texture2D tex, Vector2 tiling)
        {
            if (t == null || tex == null) return;
            var r = t.GetComponent<Renderer>();
            if (r == null || r.sharedMaterial == null) return;
            r.sharedMaterial.mainTexture = tex;
            r.sharedMaterial.color = Color.white;
            r.sharedMaterial.mainTextureScale = tiling;
        }

        private static void BuildSkyDome(Transform worldRoot, Texture2D sky)
        {
            var dome = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            dome.name = "SkyDome";
            dome.transform.SetParent(worldRoot, false);
            dome.transform.localPosition = new Vector3(0, 0, 10f);
            dome.transform.localScale = new Vector3(-200f, 200f, 200f); // inside-out
            var r = dome.GetComponent<Renderer>();
            var m = new Material(Shader.Find("Unlit/Texture"));
            m.mainTexture = sky;
            r.sharedMaterial = m;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            Object.Destroy(dome.GetComponent<Collider>());
        }
    }
}

using CricketGame.Core.Rules;
using CricketGame.Core.Rules.LimitedOvers;
using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>
    /// Phase 5: a 3D stadium scoreboard above the sightscreen, driven directly
    /// by the rules engine events (spec 9: scoreboard updates automatically,
    /// single source of truth). Visible from the broadcast and setup cameras.
    /// </summary>
    public sealed class StadiumScoreboard : MonoBehaviour
    {
        private TextMesh text;
        private LimitedOversMatch match;

        public static StadiumScoreboard Attach(Transform worldRoot)
        {
            var go = new GameObject("StadiumScoreboard");
            go.transform.SetParent(worldRoot, false);
            var board = go.AddComponent<StadiumScoreboard>();

            var panel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            panel.name = "BoardPanel";
            panel.transform.SetParent(go.transform, false);
            panel.transform.localPosition = new Vector3(0, 9.6f, 34.2f);
            panel.transform.localScale = new Vector3(13f, 2.6f, 0.3f);
            var r = panel.GetComponent<Renderer>();
            r.sharedMaterial = new Material(Shader.Find("Unlit/Color"));
            r.sharedMaterial.color = new Color(0.03f, 0.05f, 0.10f);
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            Object.Destroy(panel.GetComponent<Collider>());

            var textGo = new GameObject("BoardText");
            textGo.transform.SetParent(go.transform, false);
            textGo.transform.localPosition = new Vector3(0, 9.6f, 34.0f);
            textGo.transform.localEulerAngles = Vector3.zero;
            board.text = textGo.AddComponent<TextMesh>();
            var font = UiKit.DefaultFont;
            if (font != null)
            {
                board.text.font = font;
                var mr = textGo.GetComponent<MeshRenderer>();
                if (mr != null && font.material != null) mr.sharedMaterial = font.material;
            }
            board.text.characterSize = 0.32f;
            board.text.fontSize = 48;
            board.text.alignment = TextAlignment.Center;
            board.text.anchor = TextAnchor.MiddleCenter;
            board.text.color = new Color(0.4f, 0.95f, 1f);
            board.text.text = "SUPER OVER";
            return board;
        }

        public void BindMatch(LimitedOversMatch m, bool playerBatsFirst)
        {
            match = m;
            playerFirst = playerBatsFirst;
            m.BallCompleted += args => Refresh();
            m.InningsStarted += args => Refresh();
            Refresh();
        }

        private bool playerFirst = true;

        private void Refresh()
        {
            if (match == null || text == null) return;
            LimitedOversInnings inn = match.CurrentInnings;
            if (inn == null) inn = match.SecondInnings;
            if (inn == null) return;
            bool playerBatting = match.Phase == MatchPhase.FirstInnings;
            string side = (playerBatting == playerFirst) ? TeamKit.You.SideName : TeamKit.Ai.SideName;
            // Phase 6: cricket notation (e.g. "45/2  (7.3)") instead of ball count.
            text.text = side + "  " + inn.Runs + "/" + inn.Wickets + "   (" + inn.OversDisplay + ")";
        }
    }
}

using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Bowler
{
    /// <summary>
    /// Simple automatic bowler for testing the batting controls. Configurable
    /// pace/line/length/swing plus Full/Good/Short presets and an optional
    /// small variation so reads are not robotically identical. This is NOT the
    /// real bowling system - that comes in a later phase.
    /// </summary>
    public class TestBowler : MonoBehaviour
    {
        [System.Serializable]
        public class Settings
        {
            public float SpeedKph = 126f;
            public float Line = 0.15f;
            public float Length = 0.52f;
            public float Swing = 0f;
            public bool Variation = false;
            public float VariationAmount = 0.06f;
        }

        public Settings Config = new Settings();

        public void ApplyPreset(string preset)
        {
            switch (preset)
            {
                case "full":
                    Config.SpeedKph = 118f; Config.Line = 0f; Config.Length = 0.12f; break;
                case "good":
                    Config.SpeedKph = 126f; Config.Line = 0.15f; Config.Length = 0.52f; break;
                case "short":
                    Config.SpeedKph = 134f; Config.Line = -0.1f; Config.Length = 0.88f; break;
            }
        }

        public DeliveryData NextDelivery()
        {
            float line = Config.Line;
            float length = Config.Length;
            float swing = Config.Swing;
            float speed = Config.SpeedKph;

            if (Config.Variation)
            {
                float v = Config.VariationAmount;
                line = Mathf.Clamp(line + Random.Range(-v, v) * 2f, -1.2f, 1.2f);
                length = Mathf.Clamp01(length + Random.Range(-v, v));
                swing = Mathf.Clamp(swing + Random.Range(-v, v), -1f, 1f);
                speed = Mathf.Max(70f, speed + Random.Range(-4f, 4f));
            }

            return new DeliveryData
            {
                SpeedKph = speed,
                Line = line,
                Length = length,
                Swing = swing
            };
        }

        // ------------------------------------------------ run-up animation

        private bool running;
        private float runClock;
        private Vector3 startPos = new Vector3(0.2f, 0f, 26f);
        private Vector3 releasePos = new Vector3(0.15f, 0f, 20.2f);
        private Transform rig;
        private Transform arm;

        public void AttachRig(Transform bowlerRoot, Transform bowlerArm)
        {
            rig = bowlerRoot;
            arm = bowlerArm;
            rig.localPosition = startPos;
        }

        public void StartRunUp()
        {
            running = true;
            runClock = 0f;
        }

        public float RunUpDuration { get { return 0.9f; } }
        public bool Running { get { return running; } }

        private void Update()
        {
            if (!running || rig == null) return;

            runClock += Time.deltaTime;
            float t = Mathf.Clamp01(runClock / RunUpDuration);
            rig.localPosition = Vector3.Lerp(startPos, releasePos, t);

            if (arm != null)
            {
                // simple arm windmill in the last 40% of the approach
                float armT = Mathf.InverseLerp(0.6f, 1f, t);
                arm.localEulerAngles = new Vector3(-360f * armT, 0, 0);
            }

            if (t >= 1f) running = false;
        }

        public void ResetPosition()
        {
            running = false;
            if (rig != null) rig.localPosition = startPos;
            if (arm != null) arm.localEulerAngles = Vector3.zero;
        }
    }
}

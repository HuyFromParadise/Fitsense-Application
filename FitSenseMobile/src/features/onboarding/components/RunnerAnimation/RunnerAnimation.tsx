import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Path,
  Rect,
} from 'react-native-svg';

import { useTheme } from '../../../../app/providers/ThemeProvider';
import {
  FAR_SCENERY_WIDTH,
  NEAR_SCENERY_WIDTH,
  useRunnerAnimation,
} from '../../animations/useRunnerAnimation';
import { AnimatedRoad } from '../AnimatedRoad';
import { TurtleSmoke } from '../TurtleSmoke';

export interface RunnerAnimationProps {
  height?: number;
  fullScreen?: boolean;
}

// Stage dimensions in original Runner.svg coordinate units (shifted by -150, -175)
const STAGE_SIZE = 320;
const STAGE_SCALE = 0.54;

/**
 * Splash Screen Runner Animation built from `assets/images/Runner.svg`
 * with FitSense animated background:
 * - Seamless far parallax hills & stylized geometric trees
 * - Seamless scrolling `AnimatedRoad`
 * - Billowing `TurtleSmoke` dust trail behind the runner
 * - Articulated `Runner.svg` figure driven on the native UI thread (`useNativeDriver: true`)
 */
export function RunnerAnimation({
  height = 248,
  fullScreen = false,
}: RunnerAnimationProps) {
  const { colors } = useTheme();
  const anim = useRunnerAnimation(true);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="FitSense animated runner sprinting on a fitness track"
      style={[
        styles.sceneContainer,
        fullScreen ? StyleSheet.absoluteFill : { height },
        fullScreen ? styles.sceneCentered : styles.sceneBottom,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <View style={[styles.stageBox, { height }]}>
      {/* Far parallax hills (seamless 320px tile) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.parallaxLayer,
          styles.farLayer,
          { transform: [{ translateX: anim.farHillsTranslateX }] },
        ]}>
        <Svg width={FAR_SCENERY_WIDTH * 2} height={110} viewBox="0 0 640 110">
          {[0, FAR_SCENERY_WIDTH].map(offset => (
            <G key={`far-${offset}`} transform={`translate(${offset}, 0)`}>
              {/* Distant ridge */}
              <Path
                d="M0 110 L0 64 Q44 26 96 52 T204 38 T320 64 L320 110 Z"
                fill={colors.surfaceAlt}
                fillOpacity="0.65"
              />
              {/* Subtle athletic rim highlight along distant ridge */}
              <Path
                d="M0 64 Q44 26 96 52 T204 38 T320 64"
                fill="none"
                stroke={colors.primary}
                strokeOpacity="0.2"
                strokeWidth="1.5"
              />
              {/* Midground rolling hill */}
              <Path
                d="M0 110 L0 78 Q72 48 152 72 T320 78 L320 110 Z"
                fill={colors.border}
                fillOpacity="0.4"
              />
            </G>
          ))}
        </Svg>
      </Animated.View>

      {/* Road Surface & Moving Markings */}
      <AnimatedRoad roadTranslateX={anim.roadTranslateX} />

      {/* Billowing Dust / Smoke Clouds behind the runner */}
      <TurtleSmoke particles={anim.dustParticles} visible />

      {/* Ground shadow beneath the runner */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.groundShadow,
          {
            backgroundColor: colors.background,
            opacity: anim.shadowOpacity,
            transform: [{ scaleX: anim.shadowScaleX }],
          },
        ]}
      />

      {/* Scaled Articulated Runner from Runner.svg */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.runnerStageWrapper,
          {
            transform: [
              { translateY: anim.bodyBounceY },
              { scale: STAGE_SCALE },
            ],
          },
        ]}>
        {/*
         * Joint coordinates in 320x320 stage = Runner.svg (600x600) shifted by (-150, -175):
         *   Shoulder pivot: (183.813, 97.804)
         *   Hip pivot:      (144.0,   155.0)
         *   Head pivot:     (216.844, 72.141)
         */}

        {/* 1. Far Arm (i0) - rotates 0 -> -180 -> 0 */}
        <Animated.View
          style={[
            styles.jointPivotBox,
            styles.shoulderPivot,
            { transform: [{ rotate: anim.farArmAngle }] },
          ]}>
          {/* Upper Arm SVG centered at shoulder (120, 120) */}
          <Svg width={240} height={240} viewBox="-120 -120 240 240">
            <G transform="translate(-118.841, -46.182)">
              <G transform="translate(75.045, 16.915)">
                <Path
                  fill={colors.primary}
                  d="M14.994,-0.414C15.223,7.867,8.695,14.765,0.413,14.994C-7.868,15.223,-14.766,8.694,-14.995,0.414C-15.223,-7.868,-8.695,-14.766,-0.414,-14.995C7.867,-15.223,14.765,-8.695,14.994,-0.414Z"
                />
              </G>
              <G transform="translate(118.841, 46.182)">
                <Path
                  fill={colors.primary}
                  d="M13.09,-11.615C19.505,-4.386,18.844,6.676,11.614,13.09C4.385,19.504,-6.676,18.843,-13.091,11.614C-19.505,4.384,-18.844,-6.676,-11.614,-13.09C-4.385,-19.504,6.676,-18.844,13.09,-11.615Z"
                />
              </G>
              <G transform="translate(97.904, 32.689)">
                <Path
                  fill={colors.warning}
                  d="M30.663,-1.06C30.895,-0.899,11.214,28.045,11.214,28.045C11.214,28.045,-30.895,-3.107,-30.895,-3.107C-30.895,-3.107,-14.229,-28.045,-14.229,-28.045C-14.229,-28.045,30.663,-1.06,30.663,-1.06Z"
                />
              </G>
            </G>
          </Svg>

          {/* Far Forearm child pivot at elbow offset (-43.914, -28.555) */}
          <Animated.View
            style={[
              styles.childPivotBox,
              styles.farElbowOffset,
              { transform: [{ rotate: anim.farForearmAngle }] },
            ]}>
            <Svg width={180} height={180} viewBox="-90 -90 180 180">
              <G transform="translate(-74.927, -17.627)">
                <G transform="translate(11.67, 45.987)">
                  <Path
                    fill={colors.warning}
                    d="M5.053,-8.63C9.819,-5.84,11.42,0.286,8.63,5.052C5.839,9.818,-0.285,11.42,-5.051,8.63C-9.818,5.84,-11.421,-0.286,-8.63,-5.052C-5.84,-9.818,0.287,-11.42,5.053,-8.63Z"
                  />
                </G>
                <G transform="translate(74.969, 17.381)">
                  <Path
                    fill={colors.warning}
                    d="M7.578,-12.945C14.727,-8.759,17.13,0.429,12.945,7.578C8.759,14.727,-0.429,17.13,-7.578,12.945C-14.728,8.759,-17.13,-0.428,-12.945,-7.578C-8.759,-14.727,0.429,-17.131,7.578,-12.945Z"
                  />
                </G>
                <G transform="translate(44.348, 29.402)">
                  <Path
                    fill={colors.warning}
                    d="M24.443,-25.691C24.443,-25.691,36.796,1.645,36.796,1.645C36.796,1.645,-28.562,25.691,-28.562,25.691C-28.562,25.691,-36.796,7.472,-36.796,7.472C-36.796,7.472,24.443,-25.691,24.443,-25.691Z"
                  />
                </G>
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* 2. Back Leg (i8) - rotates 0 -> 115 -> 0 */}
        <Animated.View
          style={[
            styles.jointPivotBox,
            styles.hipPivot,
            { transform: [{ rotate: anim.backThighAngle }] },
          ]}>
          <Svg width={240} height={240} viewBox="-120 -120 240 240">
            <G transform="translate(-33.078, -29.036)">
              <G transform="translate(33.241, 28.616)">
                <Path
                  fill={colors.primary}
                  d="M-9.462,-23.14C3.318,-28.366,17.915,-22.242,23.141,-9.462C28.366,3.318,22.242,17.915,9.462,23.14C-3.318,28.366,-17.914,22.242,-23.14,9.462C-28.366,-3.318,-22.242,-17.914,-9.462,-23.14Z"
                />
              </G>
              <G transform="translate(108.12, 57.72)">
                <Path
                  fill={colors.primary}
                  d="M-6.623,-16.199C2.323,-19.857,12.541,-15.57,16.198,-6.624C19.856,2.322,15.57,12.54,6.624,16.198C-2.322,19.857,-12.54,15.569,-16.197,6.622C-19.855,-2.323,-15.569,-12.541,-6.623,-16.199Z"
                />
              </G>
              <G transform="translate(69.324, 39.676)">
                <Path
                  fill={colors.primary}
                  d="M-45.137,12.235C-45.137,12.235,-27.028,-34.355,-27.028,-34.355C-27.028,-34.355,45.137,1.733,45.137,1.733C45.137,1.733,32.457,34.355,32.457,34.355C32.457,34.355,-45.137,12.235,-45.137,12.235Z"
                />
              </G>
            </G>
          </Svg>

          {/* Back Calf child pivot at knee offset (+74.978, +28.704) */}
          <Animated.View
            style={[
              styles.childPivotBox,
              styles.backKneeOffset,
              { transform: [{ rotate: anim.backCalfAngle }] },
            ]}>
            <Svg width={240} height={240} viewBox="-120 -120 240 240">
              <G transform="translate(-108.056, -57.74)">
                <G transform="translate(11.477, 109.682)">
                  <Path
                    fill={colors.primary}
                    d="M9.497,3.132C7.767,8.377,2.113,11.227,-3.132,9.496C-8.377,7.767,-11.227,2.111,-9.497,-3.134C-7.767,-8.379,-2.112,-11.227,3.133,-9.498C8.377,-7.767,11.227,-2.112,9.497,3.132Z"
                  />
                </G>
                <G transform="translate(108.12, 57.72)">
                  <Path
                    fill={colors.primary}
                    d="M16.62,5.481C13.593,14.66,3.697,19.646,-5.482,16.619C-14.66,13.591,-19.647,3.698,-16.619,-5.481C-13.591,-14.66,-3.696,-19.646,5.482,-16.619C14.661,-13.591,19.647,-3.698,16.62,5.481Z"
                  />
                </G>
                <G transform="translate(61.074, 80.453)">
                  <Path
                    fill={colors.primary}
                    d="M38.562,-38.515C38.562,-38.515,55.334,-7.321,55.334,-7.321C55.334,-7.321,-45.895,38.515,-45.895,38.515C-45.895,38.515,-55.334,20.961,-55.334,20.961C-55.334,20.961,38.562,-38.515,38.562,-38.515Z"
                  />
                </G>
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* 3. Athletic Torso connecting Hip (144, 155) and Shoulder (183.8, 97.8) */}
        <View style={styles.torsoLayer}>
          <Svg width={STAGE_SIZE} height={STAGE_SIZE} viewBox={`0 0 ${STAGE_SIZE} ${STAGE_SIZE}`}>
            <Path
              d="M167 88 L201 108 L167 166 L122 145 Z"
              fill={colors.warning}
            />
          </Svg>
        </View>

        {/* 4. Front Leg (i11) - rotates 0 -> -115 -> 0 */}
        <Animated.View
          style={[
            styles.jointPivotBox,
            styles.hipPivot,
            { transform: [{ rotate: anim.frontThighAngle }] },
          ]}>
          <Svg width={240} height={240} viewBox="-120 -120 240 240">
            <G transform="translate(-148.305, -25.813)">
              <G transform="translate(148.305, 25.813)">
                <Path
                  fill={colors.warning}
                  d="M24.978,1.06C24.393,14.855,12.735,25.563,-1.061,24.977C-14.855,24.392,-25.564,12.735,-24.978,-1.06C-24.393,-14.855,-12.735,-25.563,1.06,-24.978C14.854,-24.392,25.564,-12.735,24.978,1.06Z"
                />
              </G>
              <G transform="translate(90.604, 81.71)">
                <Path
                  fill={colors.warning}
                  d="M17.484,0.742C17.074,10.398,8.914,17.894,-0.742,17.484C-10.398,17.074,-17.894,8.914,-17.484,-0.742C-17.075,-10.399,-8.914,-17.894,0.742,-17.485C10.398,-17.074,17.894,-8.914,17.484,0.742Z"
                />
              </G>
              <G transform="translate(122.061, 51.07)">
                <Path
                  fill={colors.warning}
                  d="M8.855,-43.209C8.855,-43.209,43.633,-7.307,43.633,-7.307C43.633,-7.307,-19.281,43.209,-19.281,43.209C-19.281,43.209,-43.633,18.071,-43.633,18.071C-43.633,18.071,8.855,-43.209,8.855,-43.209Z"
                />
              </G>
            </G>
          </Svg>

          {/* Front Calf child pivot at knee offset (-57.504, +55.925) */}
          <Animated.View
            style={[
              styles.childPivotBox,
              styles.frontKneeOffset,
              { transform: [{ rotate: anim.frontCalfAngle }] },
            ]}>
            <Svg width={240} height={240} viewBox="-120 -120 240 240">
              <G transform="translate(-90.801, -81.738)">
                <G transform="translate(10.556, 156.722)">
                  <Path
                    fill={colors.warning}
                    d="M9.983,0.584C9.66,6.098,4.929,10.306,-0.584,9.982C-6.098,9.659,-10.306,4.929,-9.983,-0.585C-9.66,-6.099,-4.929,-10.306,0.585,-9.982C6.098,-9.659,10.306,-4.93,9.983,0.584Z"
                  />
                </G>
                <G transform="translate(90.584, 81.652)">
                  <Path
                    fill={colors.warning}
                    d="M17.47,1.022C16.905,10.67,8.626,18.035,-1.023,17.469C-10.671,16.905,-18.035,8.626,-17.47,-1.023C-16.905,-10.671,-8.626,-18.035,1.023,-17.47C10.672,-16.905,18.035,-8.626,17.47,1.022Z"
                  />
                </G>
                <G transform="translate(52.72, 116.664)">
                  <Path
                    fill={colors.warning}
                    d="M25.605,-48.08C25.605,-48.08,49.836,-22.249,49.836,-22.249C49.836,-22.249,-36.199,48.08,-36.199,48.08C-36.199,48.08,-49.836,33.544,-49.836,33.544C-49.836,33.544,25.605,-48.08,25.605,-48.08Z"
                  />
                </G>
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* 5. Head (i13) - rotates 0 -> 20 -> 0 around (216.844, 72.141) */}
        <Animated.View
          style={[
            styles.headPivotBox,
            { transform: [{ rotate: anim.headAngle }] },
          ]}>
          <Svg width={120} height={120} viewBox="-60 -60 120 120">
            <G transform="translate(-22.75, -45.25)">
              <Path
                d="M45.25,22.75C45.25,35.176,35.177,45.25,22.75,45.25C10.323,45.25,0.25,35.176,0.25,22.75C0.25,10.324,10.323,0.25,22.75,0.25C35.177,0.25,45.25,10.324,45.25,22.75Z"
                fill={colors.warning}
              />
            </G>
          </Svg>
        </Animated.View>

        {/* 6. Near Arm (i12) - rotates 0 -> 180 -> 0 */}
        <Animated.View
          style={[
            styles.jointPivotBox,
            styles.shoulderPivot,
            { transform: [{ rotate: anim.nearArmAngle }] },
          ]}>
          <Svg width={240} height={240} viewBox="-120 -120 240 240">
            <G transform="translate(-19.645, -21.268)">
              <G transform="translate(64.126, 49.487)">
                <Path
                  fill={colors.warning}
                  d="M-14.98,0.769C-15.406,-7.504,-9.043,-14.556,-0.77,-14.981C7.503,-15.406,14.555,-9.043,14.98,-0.77C15.406,7.503,9.043,14.555,0.77,14.98C-7.503,15.406,-14.555,9.042,-14.98,0.769Z"
                />
              </G>
              <G transform="translate(19.645, 21.269)">
                <Path
                  fill={colors.warning}
                  d="M-12.81,11.922C-19.395,4.847,-18.997,-6.226,-11.921,-12.811C-4.847,-19.395,6.226,-18.997,12.811,-11.922C19.395,-4.847,18.998,6.226,11.922,12.81C4.847,19.395,-6.226,18.997,-12.81,11.922Z"
                />
              </G>
              <G transform="translate(40.945, 34.223)">
                <Path
                  fill={colors.warning}
                  d="M-30.676,1.824C-30.911,1.668,-11.923,-27.734,-11.923,-27.734C-11.923,-27.734,30.911,2.408,30.911,2.408C30.911,2.408,14.845,27.734,14.845,27.734C14.845,27.734,-30.676,1.824,-30.676,1.824Z"
                />
              </G>
            </G>
          </Svg>

          {/* Near Forearm child pivot at elbow offset (+44.125, +27.878) */}
          <Animated.View
            style={[
              styles.childPivotBox,
              styles.nearElbowOffset,
              { transform: [{ rotate: anim.nearForearmAngle }] },
            ]}>
            <Svg width={180} height={180} viewBox="-90 -90 180 180">
              <G transform="translate(-63.77, -49.146)">
                <G transform="translate(122.346, 11.58)">
                  <Path
                    fill={colors.warning}
                    d="M-3.678,9.299C-8.814,7.268,-11.33,1.458,-9.299,-3.678C-7.268,-8.814,-1.457,-11.33,3.678,-9.299C8.814,-7.268,11.331,-1.458,9.3,3.678C7.268,8.814,1.459,11.33,-3.678,9.299Z"
                  />
                </G>
                <G transform="translate(64.148, 49.5)">
                  <Path
                    fill={colors.warning}
                    d="M-5.517,13.948C-13.22,10.901,-16.996,2.187,-13.949,-5.517C-10.902,-13.22,-2.187,-16.995,5.517,-13.948C13.22,-10.902,16.996,-2.187,13.949,5.517C10.902,13.22,2.187,16.995,-5.517,13.948Z"
                  />
                </G>
                <G transform="translate(91.884, 32.638)">
                  <Path
                    fill={colors.warning}
                    d="M-19.546,29.43C-19.546,29.43,-35.923,4.296,-35.923,4.296C-35.923,4.296,25.008,-29.43,25.008,-29.43C25.008,-29.43,35.923,-12.679,35.923,-12.679C35.923,-12.679,-19.546,29.43,-19.546,29.43Z"
                  />
                </G>
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  sceneCentered: {
    justifyContent: 'center',
  },
  sceneBottom: {
    justifyContent: 'flex-end',
  },
  stageBox: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  parallaxLayer: {
    position: 'absolute',
    left: 0,
    width: NEAR_SCENERY_WIDTH * 2,
  },
  farLayer: {
    bottom: 54,
  },
  nearLayer: {
    bottom: 54,
  },
  groundShadow: {
    position: 'absolute',
    bottom: 16,
    width: 112,
    height: 12,
    borderRadius: 999,
  },
  runnerStageWrapper: {
    position: 'absolute',
    bottom: -44,
    width: STAGE_SIZE,
    height: STAGE_SIZE,
  },
  torsoLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: STAGE_SIZE,
    height: STAGE_SIZE,
  },
  jointPivotBox: {
    position: 'absolute',
    width: 240,
    height: 240,
  },
  shoulderPivot: {
    left: 183.813 - 120,
    top: 97.804 - 120,
  },
  hipPivot: {
    left: 144 - 120,
    top: 155 - 120,
  },
  headPivotBox: {
    position: 'absolute',
    width: 120,
    height: 120,
    left: 216.844 - 60,
    top: 72.141 - 60,
  },
  childPivotBox: {
    position: 'absolute',
  },
  farElbowOffset: {
    width: 180,
    height: 180,
    left: 120 - 43.914 - 90,
    top: 120 - 28.555 - 90,
  },
  nearElbowOffset: {
    width: 180,
    height: 180,
    left: 120 + 44.125 - 90,
    top: 120 + 27.878 - 90,
  },
  backKneeOffset: {
    width: 240,
    height: 240,
    left: 120 + 74.978 - 120,
    top: 120 + 28.704 - 120,
  },
  frontKneeOffset: {
    width: 240,
    height: 240,
    left: 120 - 57.504 - 120,
    top: 120 + 55.925 - 120,
  },
});

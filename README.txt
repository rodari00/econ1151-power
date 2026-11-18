VISUALIZING POWER — ECON 1151

Open index.html in any modern browser. No installation, server, account,
network connection, R runtime, or third-party assets are needed.
The sibling power-dashboard.html is a portable single-file copy.

Controls
- Fixed H0: mu = 500 mL, matching Module 11's water-bottle example.
- Lower-, upper-, or two-tailed alternative.
- True mean used to calculate power (mu_Ha), alpha, sample size n, and
  known population standard deviation sigma_X. Each has a slider and
  numeric entry. n is bottles per sample, not the number of repetitions.
- True means lie on the selected alternative's side; the boundary 500
  is included to show rejection probability = alpha under H0.
- Default: lower-tailed, mu_Ha=496, alpha=.05, n=36, sigma_X=12.

Figures
The null and true-mean distributions share horizontal and density scales.
Alpha is shaded under H0; beta and power partition the second curve.
Dashed vertical lines are the current rejection thresholds.
The view expands only as needed so horizontal changes are not hidden by
continuous rescaling. Fit curves fits the current distributions again.
Density height can trigger vertical expansion; always compare horizontal
spread as well. Shading beyond the displayed tails is truncated visually,
but probabilities use the full infinite normal tails (no renormalization).

Power is graphed against effect size |mu_Ha - 500| in mL. The axes stay
fixed at 0-20 mL and 0-100%, making changes in the curve comparable.
For lower-tailed tests the effect is a decrease; for upper-tailed tests it
is an increase. Two-tailed power is symmetric around 500. Save comparison
pins alpha/n/sigma_X. Both dots compare the same current effect size.
Changing direction starts a new comparison; changing the selected true
mean moves the dot without changing either power curve.

Suggested classroom sequence
1. Start at the defaults. Identify the rejection threshold from H0.
2. Read alpha under H0, then beta and power under mu_Ha=496.
3. Increase n to 100. Compare with the saved curve at effect size 4 mL.
4. Reset. Lower sigma_X, then reset and lower alpha. Compare each change.
5. Change mu_Ha: the point moves along the existing power curve.
6. Select two-tailed. Both rejection tails contribute to power.
7. Open Try repeated samples. Increasing repetitions stabilizes estimated
   rates; it does not change the sampling SE or theoretical power.

Mathematics
Assume iid normal fills with known sigma_X, identical under both means.
SE = sigma_X / sqrt(n). Let Phi be the standard normal CDF and z_p its
p quantile. Rejection thresholds are:
  lower: c = 500 - z_(1-alpha) SE
  upper: c = 500 + z_(1-alpha) SE
  two:   c_L/U = 500 +/- z_(1-alpha/2) SE
Power at true mean m is respectively:
  Phi((c-m)/SE)
  1 - Phi((c-m)/SE)
  Phi((c_L-m)/SE) + 1 - Phi((c_U-m)/SE)
Beta = 1 - power, provided m is in Ha. At m=500, the dashboard explicitly
identifies the rates as rejection and non-rejection under H0.

Repeated samples use independent normal sample means with mean m and SD
SE. This is exactly the distribution of the average of n iid normal
bottle fills; drawing n individual fills is not needed. Seeded xorshift32
uniform draws and Box-Muller transforms produce reproducible experiments.
Each click advances the seed. Monte Carlo SE is sqrt(p(1-p)/B).
Theoretical curves do not change when B (repetitions) changes.

References
NIST, known-SD mean tests:
https://itl.nist.gov/div898/handbook/prc/section2/prc.htm
Penn State, power as a rejection probability under a specified alternative:
https://online.stat.psu.edu/statprogram/reviews/statistical-concepts/power-analysis
Our two-tailed calculation sums both tails exactly; it does not drop the
far tail as some sample-size approximations do.

Verification
2026-11-18: 567 parameter combinations checked against Python NormalDist
and math.erfc; maximum absolute probability difference 5.3e-8. Checked
power at H0, comparative statics, boundary input handling, tail switches,
comparison pin/reset, repeated sampling (100,000 samples per population),
CSV/SVG downloads, no browser JavaScript errors, and responsive layouts
at 1512, 1366, 768 and 390 pixels. Screenshots inspected.
Run tests/test_dashboard.py with Python and Playwright installed.
CHROME_PATH optionally selects a local Chrome/Chromium executable.
The tests use a fresh headless profile; no personal browser data is used.

GitHub Pages deployment
Repository: https://github.com/rodari00/econ1151-power
The included .github/workflows/pages.yml deploys the main branch.
Select GitHub Actions as the publishing source in Settings > Pages.
The workflow publishes only the four app files; it excludes tests/notes.
No change to the CLT repository or main personal website is needed.

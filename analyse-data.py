import csv, re
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt

cat_regex_list = [re.compile(line[0]) for line in csv.reader(open("categories.txt", "r"), delimiter=";")]

hours = list()

# Matrix with number of hours on each activity for each day
with open("data.txt", "r") as file:
    for i, line in enumerate(file):
        if i == 0:
            start_day = line
            continue
        hours.append([len(regex.findall(line)) for regex in cat_regex_list])
        
hours = np.array(hours)

X = np.arange(len(hours))

lowess = sm.nonparametric.lowess

frac = 0.008
it = 100

Y_smooth = np.array([[res[1] for res in lowess(cat, X, frac=frac, it=it)] for cat in np.transpose(hours)])

Y_smooth = Y_smooth.clip(min=0)

Y_smooth /= sum(Y_smooth)

Y_smooth = np.cumsum(Y_smooth[::-1], 0)[::-1]

# Plot

fig, ax = plt.subplots()

for i, cat in enumerate(Y_smooth):
    ax.plot(X, cat, label=str(i))
ax.legend()

st = f"{frac}-{it}"
plt.title(st)
plt.savefig(f"plot-{st}.png")

out_str = "\n".join(",".join("%0.5f" %hour for hour in day) for day in np.transpose(Y_smooth))
     
# Saves output

with open(f"data-{st}.txt", "w") as file:
    file.write(start_day)
    file.write(out_str)

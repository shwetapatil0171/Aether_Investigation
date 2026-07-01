import os
import random
from flask import Flask, render_template, session, redirect, url_for

from data import (
    victims, locations, suspect_names, weapons, occupations,
    ages, personalities, motives, clue_pool, interrogation_lines,
    location_images
)
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "aether_dev_secret_key")

MAX_ATTEMPTS = 3
NUM_SUSPECTS = 6


def generate_case():
    chosen_names = random.sample(suspect_names, NUM_SUSPECTS)
    chosen_clues = random.sample(clue_pool, NUM_SUSPECTS)

    case_suspects = []
    weighted_choices = []

    for i in range(NUM_SUSPECTS):
        clue = chosen_clues[i]
        suspect = {
            "name": chosen_names[i],
            "occupation": random.choice(occupations),
            "age": random.choice(ages),
            "personality": random.choice(personalities),
            "motive": random.choice(motives),
            "clue": clue["text"],
            "clue_weight": clue["weight"],
            "interrogated": False,
            "evidence_collected": False,
        }
        case_suspects.append(suspect)
        weighted_choices.append(clue["weight"])

    killer_index = random.choices(range(NUM_SUSPECTS), weights=weighted_choices, k=1)[0]
    location = random.choice(locations)
    tips = [
    "The guilty often avoid eye contact.",
    "Not every clue tells the truth.",
    "A strong motive doesn't always mean guilt.",
    "Liars usually change small details.",
    "Interrogate everyone before accusing."
]

    return {
        "victim": random.choice(victims),
         "location": location,
         "scene_image": location_images.get(location),
        "weapon": random.choice(weapons),
        "suspects": case_suspects,
        "killer": killer_index,
        "attempts_left": MAX_ATTEMPTS,
        "closed": False,
        "tip": random.choice(tips),
    }


def total_clue_weight(case):
    return sum(s["clue_weight"] for s in case["suspects"]) or 1


def suspicion_percent(suspect, case):
    if not suspect["evidence_collected"]:
        return 0
    return round((suspect["clue_weight"] / total_clue_weight(case)) * 100)

@app.route("/")
def landing():
    return render_template("landing.html")

@app.route("/briefing")
def briefing():
    return render_template("briefing.html")

@app.route("/crime-scene")
def crime_scene():

    case = session.get("case")

    if not case:
        session["case"] = generate_case()
        case = session["case"]

    return render_template(
        "crime_scene.html",
        case=case
    ) 

@app.route("/start")
def home():
    if "case" not in session:
        session["case"] = generate_case()
    case = session["case"]
    for s in case["suspects"]:
        s["suspicion"] = suspicion_percent(s, case)
    return render_template("index.html", case=case,
                            score=session.get("score", 0),
                            cases_solved=session.get("cases_solved", 0))


@app.route("/new-case")
def new_case():
    session["case"] = generate_case()
    return redirect(url_for("home"))


@app.route("/reset")
def reset():
    session.clear()
    return redirect(url_for("home"))


@app.route("/interrogate/<int:index>")
def interrogate(index):
    case = session.get("case")
    if not case:
        return redirect(url_for("home"))

    suspect = case["suspects"][index]
    suspect["interrogated"] = True
    session["case"] = case

    lines = interrogation_lines.get(suspect["personality"], ["{name} answers carefully."])
    response = random.choice(lines).format(name=suspect["name"])

    return render_template(
        "interrogate.html",
        suspect=suspect,
        index=index,
        response=response,
        evidence_collected=suspect["evidence_collected"],
    )


@app.route("/evidence/<int:index>")
def evidence(index):
    case = session.get("case")
    if not case:
        return redirect(url_for("home"))

    suspect = case["suspects"][index]
    if suspect["interrogated"]:
        suspect["evidence_collected"] = True

    session["case"] = case
    return redirect(url_for("home"))


@app.route("/accuse/<int:index>")
def accuse(index):
    case = session.get("case")
    if not case or case["closed"]:
        return redirect(url_for("home"))

    killer_index = case["killer"]
    history = session.get("history", [])

    if index == killer_index:
        case["closed"] = True
        session["score"] = session.get("score", 0) + (case["attempts_left"] * 10)
        session["cases_solved"] = session.get("cases_solved", 0) + 1
        history.append({
            "victim": case["victim"],
            "killer": case["suspects"][killer_index]["name"],
            "solved": True,
        })
        session["history"] = history
        session["case"] = case
        return render_template("result.html", won=True, case=case,
                                killer=case["suspects"][killer_index])

    case["attempts_left"] -= 1

    if case["attempts_left"] <= 0:
        case["closed"] = True
        history.append({
            "victim": case["victim"],
            "killer": case["suspects"][killer_index]["name"],
            "solved": False,
        })
        session["history"] = history
        session["case"] = case
        return render_template("result.html", won=False, case=case,
                                killer=case["suspects"][killer_index])

    session["case"] = case
    return render_template("result.html", won=None, case=case,
                            wrong_name=case["suspects"][index]["name"])

@app.route("/notebook")
def notebook():

    case = session.get("case")

    if not case:
        return redirect(url_for("home"))

    interrogated = []
    evidence = []

    for suspect in case["suspects"]:

        if suspect["interrogated"]:
            interrogated.append(suspect["name"])

        if suspect["evidence_collected"]:
            evidence.append({
                "name": suspect["name"],
                "clue": suspect["clue"]
            })

    return render_template(
        "notebook.html",
        case=case,
        interrogated=interrogated,
        evidence=evidence
    )

@app.route("/history")
def history():
    return render_template("history.html",
                            history=session.get("history", []),
                            score=session.get("score", 0))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

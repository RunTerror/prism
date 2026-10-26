Request 1

Here is a tip calculator. Enter the bill, pick the tip and the number of people.

```prism
const [bill, setBill] = useState(0)
const [tip, setTip] = useState(15)
const [people, setPeople] = useState(2)
const b = bill || 0
const tipAmount = b * tip / 100
const total = b + tipAmount
const each = total / people

<Card title="Tip calculator">
  <Input kind="number" label="Bill ($)" value={bill} onChange={setBill} placeholder="0" />
  <Slider label="Tip (%)" value={tip} min={0} max={30} step={1} onChange={setTip} />
  <Slider label="People" value={people} min={1} max={10} step={1} onChange={setPeople} />
  <Field label="Tip" value={"$" + tipAmount.toFixed(2)} />
  <Field label="Total" value={"$" + total.toFixed(2)} />
  <Stat label="Each person pays" value={"$" + each.toFixed(2)} />
</Card>
```
=====ANSWER=====
Request 2

Here are the three plans. Pick one, then tap the button.

```prism
const [plan, setPlan] = useState("")

<Stack>
  <Compare
    items={[
      { name: "Basic", price: "$10 a month", data: "5 GB" },
      { name: "Plus", price: "$20 a month", data: "20 GB" },
      { name: "Max", price: "$35 a month", data: "Unlimited" }
    ]}
    fields={["price", "data"]}
    value={plan}
    onChange={setPlan}
  />
  <Button main disabled={plan === ""} onPress={() => P.ask("I choose the " + plan + " plan")}>Choose {plan || "a plan"}</Button>
</Stack>
```
=====ANSWER=====
Request 3

Add your exercises, then tick them off as you finish.

```prism
const [exercises, setExercises] = useState([])
const [name, setName] = useState("")
const doneCount = exercises.filter(e => e.done).length

<Card title="Workout">
  <Row>
    <Input label="Exercise" value={name} onChange={setName} placeholder="Push-ups" />
    <Button main onPress={() => { if (name) { setExercises([...exercises, { id: exercises.length + 1, name: name, done: false }]); setName("") } }}>Add</Button>
  </Row>
  {exercises.map(e => <Switch key={e.id} label={e.name} value={e.done} onChange={v => setExercises(exercises.map(x => x.id === e.id ? { ...x, done: v } : x))} />)}
  <Stat label="Done" value={doneCount + " of " + exercises.length} />
</Card>
```
=====ANSWER=====
Request 4

Here is your monthly budget.

```prism
const income = 2500
const rent = 1200
const food = 400
const transport = 150
const fun = 200
const spent = rent + food + transport + fun
const left = income - spent

<Card title="Monthly budget">
  <Field label="Rent" value={String(rent)} />
  <Field label="Food" value={String(food)} />
  <Field label="Transport" value={String(transport)} />
  <Field label="Fun" value={String(fun)} />
  <Divider />
  <Progress value={spent / income} label="Spent" />
  <Stat label="Left over" value={String(left)} />
</Card>
```
=====ANSWER=====
Request 5

Here are the notification settings.

```prism
const [notifications, setNotifications] = useState(true)
const [volume, setVolume] = useState(50)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications">
  <Switch label="Notifications" value={notifications} onChange={setNotifications} />
  <Slider label="Volume" value={volume} min={0} max={100} onChange={setVolume} />
  <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  <Text secondary>Quiet hours mute alerts at night.</Text>
  <Button main onPress={() => P.toast("Settings saved")}>Save</Button>
</Card>
```
=====ANSWER=====
Request 6

Pick a direction and type a number.

```prism
const [amount, setAmount] = useState(0)
const [mode, setMode] = useState("km to miles")
const a = amount || 0
const result = mode === "km to miles" ? a * 0.621371 : a / 0.621371

<Card title="Unit converter">
  <Choice value={mode} options={["km to miles", "miles to km"]} onChange={setMode} />
  <Input kind="number" label={mode === "km to miles" ? "Kilometres" : "Miles"} value={amount} onChange={setAmount} placeholder="0" />
  <Stat label={mode === "km to miles" ? "Miles" : "Kilometres"} value={result.toFixed(2)} />
</Card>
```
=====ANSWER=====
Request 7

Enter your height and weight to see your BMI.

```prism
const [height, setHeight] = useState(0)
const [weight, setWeight] = useState(0)
const h = (height || 0) / 100
const w = weight || 0
const bmi = h > 0 ? w / (h * h) : 0
let category = ""
let status = "warning"
if (bmi < 18.5) {
  category = "Underweight"
} else if (bmi < 25) {
  category = "Healthy"
  status = "good"
} else if (bmi < 30) {
  category = "Overweight"
} else {
  category = "Obese"
  status = "bad"
}

<Card title="BMI">
  <Input kind="number" label="Height (cm)" value={height} onChange={setHeight} placeholder="170" />
  <Input kind="number" label="Weight (kg)" value={weight} onChange={setWeight} placeholder="65" />
  <Stat label="BMI" value={bmi > 0 ? bmi.toFixed(1) : "-"} />
  {bmi > 0 && <Text strong status={status}>{category}</Text>}
</Card>
```
=====ANSWER=====
Request 8

Add items with a quantity. The count shows how many are left to buy.

```prism
const [items, setItems] = useState([])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)
const left = items.filter(i => !i.bought).length

<Card title="Shopping list">
  <Input label="Item" value={name} onChange={setName} placeholder="Milk" />
  <Input kind="number" label="Quantity" value={qty} onChange={setQty} />
  <Button main onPress={() => { if (name) { setItems([...items, { id: items.length + 1, name: name, qty: qty || 1, bought: false }]); setName("") } }}>Add item</Button>
  <Stat label="Left to buy" value={String(left)} />
  {items.map(i => <Row key={i.id}>
    <Text strike={i.bought}>{i.qty} x {i.name}</Text>
    <Button onPress={() => setItems(items.map(x => x.id === i.id ? { ...x, bought: !x.bought } : x))}>{i.bought ? "Undo" : "Got it"}</Button>
  </Row>)}
</Card>
```
=====ANSWER=====
Request 9

Answer the three questions. Your score shows at the end.

```prism
const questions = [
  { q: "Which planet is closest to the Sun?", options: ["Mercury", "Venus", "Earth", "Mars"], answer: "Mercury" },
  { q: "Which is the largest planet?", options: ["Mars", "Jupiter", "Saturn", "Venus"], answer: "Jupiter" },
  { q: "How many moons does Earth have?", options: ["Zero", "One", "Two", "Four"], answer: "One" }
]
const [picked, setPicked] = useState(["", "", ""])
const answered = picked.filter(p => p !== "").length
const score = questions.filter((q, i) => picked[i] === q.answer).length

<Stack>
  {questions.map((q, i) => <Card key={i} title={"Question " + (i + 1)}>
    <Text strong>{q.q}</Text>
    <Options options={q.options} value={picked[i]} onChange={v => setPicked(picked.map((p, j) => j === i ? v : p))} />
  </Card>)}
  {answered === 3 && <Stat label="Your score" value={score + " of 3"} />}
</Stack>
```
=====ANSWER=====
Request 10

Change the servings and the ingredients scale with it. These amounts are for 4 servings.

```prism
const [servings, setServings] = useState(4)
const f = servings / 4
const ingredients = [
  { name: "Flour", base: 240, unit: "g" },
  { name: "Milk", base: 300, unit: "ml" },
  { name: "Eggs", base: 2, unit: "" },
  { name: "Sugar", base: 30, unit: "g" },
  { name: "Butter, melted", base: 30, unit: "g" }
]

<Card title="Pancakes">
  <Slider label="Servings" value={servings} min={1} max={12} step={1} onChange={setServings} />
  {ingredients.map(i => <Field key={i.name} label={i.name} value={(Math.round(i.base * f * 10) / 10) + " " + i.unit} />)}
  <Steps>
    <Step title="Mix">Whisk the flour, sugar and eggs, then add the milk and butter.</Step>
    <Step title="Cook">Pour small rounds into a hot pan and flip when bubbles form.</Step>
  </Steps>
</Card>
```
=====ANSWER=====
Request 11

Chris pays for his $12 salad. Ana and Ben share the rest equally, so each pays $39.

```prism
const [total, setTotal] = useState(90)
const [chris, setChris] = useState(12)
const t = total || 0
const c = chris || 0
const rest = (t - c) / 2

<Card title="Dinner split">
  <Input kind="number" label="Bill ($)" value={total} onChange={setTotal} />
  <Input kind="number" label="Chris's salad ($)" value={chris} onChange={setChris} />
  <Field label="Ana" value={"$" + rest.toFixed(2)} />
  <Field label="Ben" value={"$" + rest.toFixed(2)} />
  <Field label="Chris" value={"$" + c.toFixed(2)} />
  <Stat label="Total" value={"$" + t.toFixed(2)} />
</Card>
```
=====ANSWER=====
Request 12

Tick the days you kept each habit this week.

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const [habits, setHabits] = useState([
  { name: "Read 20 minutes", done: [] },
  { name: "Walk", done: [] },
  { name: "Drink water", done: [] }
])
const doneTotal = habits.reduce((n, h) => n + h.done.length, 0)

<Stack>
  {habits.map((h, i) => <Card key={h.name} title={h.name}>
    <Row wrap>
      {days.map(d => <Switch key={d} label={d} value={h.done.includes(d)} onChange={v => setHabits(habits.map((x, j) => j === i ? { ...x, done: v ? [...x.done, d] : x.done.filter(k => k !== d) } : x))} />)}
    </Row>
  </Card>)}
  <Stat label="Done this week" value={doneTotal + " of 21"} />
</Stack>
```
=====ANSWER=====
Request 13

Here is the weather in London now. I do not have the next 3 hours of forecast, so those are not shown.

```prism
<Card title="London" subtitle="Now">
  <Stat label="Temperature" value="18°C" />
  <Field label="Sky" value="Cloudy" />
  <Field label="Humidity" value="60%" />
  <Field label="Wind" value="12 km/h" />
</Card>
```
=====ANSWER=====
Request 14

The submit button stays off until all three fields are filled in. The strength hint changes as you type.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(x => x).length
const filled = name !== "" && email !== "" && password !== ""
let strength = "Weak"
let status = "bad"
if (score >= 4) {
  strength = "Strong"
  status = "good"
} else if (score >= 2) {
  strength = "Okay"
  status = "warning"
}

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} placeholder="Ada" />
  <Input kind="email" label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
  <Input label="Password" value={password} onChange={setPassword} />
  {password !== "" && <Text strong status={status}>{"Password strength: " + strength}</Text>}
  <Button main disabled={!filled} onPress={() => P.ask("Sign me up as " + name + " (" + email + ")")}>Sign up</Button>
</Card>
```
=====ANSWER=====
Request 15

A screen cannot count down by itself, so this version lets you take off a minute at a time as it passes.

```prism
const [seconds, setSeconds] = useState(300)
const m = Math.floor(seconds / 60)
const s = seconds % 60
const shown = m + ":" + (s < 10 ? "0" + s : String(s))

<Card title="Countdown">
  <Stat label="Time left" value={shown} />
  <Progress value={seconds / 300} />
  <Row>
    <Button main onPress={() => setSeconds(Math.max(0, seconds - 60))}>Minus 1 minute</Button>
    <Button onPress={() => setSeconds(300)}>Reset</Button>
  </Row>
</Card>
```
=====ANSWER=====
Request 16

Switch between monthly and yearly to see the prices change.

```prism
const [period, setPeriod] = useState("Monthly")
const yearly = period === "Yearly"
const plans = [
  { name: "Free", monthly: 0, yearly: 0 },
  { name: "Pro", monthly: 10, yearly: 96 },
  { name: "Team", monthly: 25, yearly: 240 }
]

<Stack>
  <Choice value={period} options={["Monthly", "Yearly"]} onChange={setPeriod} />
  <Compare
    items={plans.map(p => ({ name: p.name, price: yearly ? "$" + p.yearly + " a year" : "$" + p.monthly + " a month" }))}
    fields={["price"]}
  />
</Stack>
```
=====ANSWER=====
Request 17

Here are your steps for the last 7 days, in the order you gave them.

```prism
const steps = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
const average = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length)

<Card title="Steps, last 7 days">
  <Chart kind="bar" data={steps} labels={labels} label="Steps per day" />
  <Stat label="Daily average" value={average.toLocaleString("en-US")} />
</Card>
```
=====ANSWER=====
Request 18

I cannot show a photo here, so the card has no picture.

```prism
<Card title="Wireless headphones" subtitle="Headphones">
  <Stat label="Price" value="$129" />
  <Stat label="Rating" value="4.5 of 5 stars" />
  <Button main onPress={() => P.toast("Added to cart")}>Add to cart</Button>
</Card>
```
=====ANSWER=====
Request 19

Go through the three steps, then confirm.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [start, setStart] = useState("")
const [end, setEnd] = useState("")

<Card title={"Step " + step + " of 3"}>
  <Progress value={step / 3} />
  {step === 1 && <Stack>
    <Title>Pick a destination</Title>
    <Input label="Destination" value={destination} onChange={setDestination} placeholder="Goa" />
  </Stack>}
  {step === 2 && <Stack>
    <Title>Pick dates</Title>
    <Input label="Start date" value={start} onChange={setStart} placeholder="30 Oct" />
    <Input label="End date" value={end} onChange={setEnd} placeholder="6 Nov" />
  </Stack>}
  {step === 3 && <Stack>
    <Title>Confirm</Title>
    <Field label="Destination" value={destination} />
    <Field label="Dates" value={start + " to " + end} />
  </Stack>}
  <Row>
    {step > 1 && <Button onPress={() => setStep(step - 1)}>Back</Button>}
    {step < 3 && <Button main onPress={() => setStep(step + 1)}>Next</Button>}
    {step === 3 && <Button main onPress={() => P.ask("Book the trip to " + destination + " from " + start + " to " + end)}>Confirm trip</Button>}
  </Row>
</Card>
```
=====ANSWER=====
Request 20

Vote for one feature. The results appear after you vote.

```prism
const options = ["Dark mode", "Offline mode", "Search", "Sharing"]
const [vote, setVote] = useState("")
const [votes, setVotes] = useState([0, 0, 0, 0])

<Card title="Which feature should we build next?">
  <Options options={options} value={vote} onChange={v => {
    if (vote === "") {
      setVote(v)
      setVotes(votes.map((n, i) => options[i] === v ? n + 1 : n))
    }
  }} />
  {vote !== "" && <Chart kind="bar" data={votes} labels={options} label="Poll results" />}
</Card>
```
=====ANSWER=====
Request 21

HTTPS protects your password in four steps.

```prism
<Steps>
  <Step title="Secure channel">Your browser and the site agree on a secret code before any data is sent.</Step>
  <Step title="Check identity">The site shows a certificate that proves it is really the site you meant.</Step>
  <Step title="Scramble">Your password is locked with that code, so anyone on the same Wi-Fi only sees scrambled data.</Step>
  <Step title="Arrive safely">Only the site holds the key to unlock it.</Step>
</Steps>
```
=====ANSWER=====
Request 22

The second visit is faster because the browser keeps copies of files it already downloaded.

```prism
<Steps>
  <Step title="First visit">The browser downloads every file of the page.</Step>
  <Step title="Save copies">It keeps copies of images, styles and scripts on your device.</Step>
  <Step title="Second visit">It reuses the saved copies instead of downloading them again.</Step>
  <Step title="Check for changes">It only downloads files that have changed since last time.</Step>
</Steps>
```
=====ANSWER=====
Request 23

Try the exercise. Open the hint or the answer only when you want them.

```prism
<Card title="Python lists exercise">
  <Text>Make a list called nums with the numbers 1 to 5. Then print the third number.</Text>
  <Reveal label="Show hint">
    <Text>Lists start counting at 0, so the third item is at position 2.</Text>
  </Reveal>
  <Reveal label="Show answer">
    <Code language="python" code={"nums = [1, 2, 3, 4, 5]\nprint(nums[2])"} />
  </Reveal>
</Card>
```
=====ANSWER=====
Request 24

Tell me your level and the topics you care about.

```prism
const [level, setLevel] = useState("")
const [topics, setTopics] = useState([])

<Card title="Your Python path">
  <Text strong>What is your level?</Text>
  <Options options={["New to it", "Some practice", "Expert"]} value={level} onChange={setLevel} />
  <Text strong>Which topics do you care about?</Text>
  <Options options={["Basics", "Data", "Web", "Automation"]} multiple onChange={setTopics} />
  <Button main disabled={level === "" || topics.length === 0} onPress={() => P.ask("My level is " + level + ". I want to learn: " + topics.join(", "))}>Start learning</Button>
</Card>
```
=====ANSWER=====
Request 25

I need your name and phone number to book the table.

```prism
<Stack>
  <Text secondary>Toit, Saturday at 8 pm, for 4 people.</Text>
  <Form submit="Book table" fields={[{ name: "name", label: "Name", required: true }, { name: "phone", label: "Phone number", kind: "phone", required: true }]} />
</Stack>
```
=====ANSWER=====
Request 26

Here is my plan before I search. I cannot see live prices here, so the search itself is not done yet.

```prism
<Stack>
  <Plan items={[
    { title: "Find cheap flights to Goa", state: "waiting", detail: "Friday, 30 Oct" },
    { title: "Compare prices", state: "waiting" },
    { title: "Show you the best option", state: "waiting" }
  ]} />
  <Form submit="Start search" fields={[{ name: "from", label: "Leaving from", required: true }]} />
</Stack>
```
=====ANSWER=====
Request 27

This email will only say "See you Monday!". I do not have your class notes, so they are not included.

```prism
<Confirm title="Send this email to Priya?" action="send_email" args={{ to: "Priya", subject: "Notes from today's class", body: "See you Monday!" }} allow="Send">
  <Field label="To" value="Priya" />
  <Field label="Subject" value="Notes from today's class" />
  <Text>See you Monday!</Text>
</Confirm>
```
=====ANSWER=====
Request 28

This deletes your backups, so please check first.

```prism
<Confirm title="Delete all backups from before 2025?" action="delete_backups" args={{ before: "2025-01-01" }} allow="Delete" danger>
  <Text secondary>This cannot be undone.</Text>
</Confirm>
```
=====ANSWER=====
Request 29

Python was created by Guido van Rossum, and the first public release came in 1991 [1][2].

```prism
<Sources items={[{ title: "Foreword for Programming Python", site: "python.org", url: "https://www.python.org/doc/essays/foreword/" }, { title: "Python (programming language)", site: "wikipedia.org", url: "https://en.wikipedia.org/wiki/Python_(programming_language)" }]} />
```
=====ANSWER=====
Request 30

When you log in, the app checks your password. If it is wrong, you see an error and try again.

```prism
<Flow
  nodes={[
    { title: "Type password" },
    { title: "Check password" },
    { title: "Show home screen" },
    { title: "Show error" }
  ]}
  links={[
    { from: "Type password", to: "Check password" },
    { from: "Check password", to: "Show home screen", label: "right" },
    { from: "Check password", to: "Show error", label: "wrong" },
    { from: "Show error", to: "Type password", label: "try again" }
  ]}
/>
```

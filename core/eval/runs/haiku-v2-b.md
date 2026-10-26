Request 1

```prism
const [bill, setBill] = useState(60)
const [people, setPeople] = useState(2)
const [tipPct, setTipPct] = useState(15)
const tip = bill * tipPct / 100
const total = bill + tip
const each = total / people

<Card title="Tip calculator">
  <Slider label="Bill ($)" value={bill} min={1} max={500} step={1} onChange={setBill} />
  <Slider label="Tip (%)" value={tipPct} min={0} max={30} step={1} onChange={setTipPct} />
  <Slider label="People" value={people} min={1} max={12} onChange={setPeople} />
  <Field label="Tip" value={"$" + tip.toFixed(2)} />
  <Field label="Total" value={"$" + total.toFixed(2)} />
  <Stat label="Each person pays" value={"$" + each.toFixed(2)} />
</Card>
```

=====ANSWER=====

Request 2

```prism
const [choice, setChoice] = useState("")

<Stack>
  <Compare
    items={[
      { name: "Basic", price: "$10 a month", data: "5 GB" },
      { name: "Plus", price: "$20 a month", data: "20 GB" },
      { name: "Max", price: "$35 a month", data: "Unlimited" }
    ]}
    fields={[{ label: "Price", value: "price" }, { label: "Data", value: "data" }]}
    value={choice}
    onChange={setChoice}
  />
  <Button main disabled={choice === ""} onPress={() => P.ask("I choose the " + choice + " plan")}>Choose this plan</Button>
</Stack>
```

=====ANSWER=====

Request 3

```prism
const [name, setName] = useState("")
const [exercises, setExercises] = useState([])
const doneCount = exercises.filter(e => e.done).length
const share = exercises.length === 0 ? 0 : doneCount / exercises.length

<Card title="Workout">
  <Input label="Exercise" value={name} onChange={setName} placeholder="Push-ups" />
  <Button main disabled={name === ""} onPress={() => { setExercises([...exercises, { id: exercises.length + 1, name: name, done: false }]); setName("") }}>Add exercise</Button>
  <Progress value={share} label="Done" />
  {exercises.map(e => <Switch key={e.id} label={e.name} value={e.done} onChange={v => setExercises(exercises.map(x => x.id === e.id ? { ...x, done: v } : x))} />)}
</Card>
```

=====ANSWER=====

Request 4

```prism
const income = 2500
const items = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = items.reduce((sum, i) => sum + i.amount, 0)
const left = income - spent

<Card title="Monthly budget">
  <Stat label="Left to spend" value={"$" + left} />
  <Progress value={spent / income} label={"Spent $" + spent + " of $" + income} />
  <Chart kind="bar" label="Spending by category" data={items.map(i => i.amount)} labels={items.map(i => i.name)} />
  {items.map(i => <Field key={i.name} label={i.name} value={"$" + i.amount} />)}
</Card>
```

=====ANSWER=====

Request 5

```prism
const [notifications, setNotifications] = useState(true)
const [volume, setVolume] = useState(60)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications">
  <Switch label="Notifications" value={notifications} onChange={setNotifications} />
  <Slider label="Volume" value={volume} min={0} max={100} disabled={!notifications} onChange={setVolume} />
  <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  <Text secondary>When quiet hours are on, alerts are muted.</Text>
</Card>
```

=====ANSWER=====

Request 6

```prism
const [direction, setDirection] = useState("km to miles")
const [amount, setAmount] = useState(10)
const toMiles = direction === "km to miles"
const result = toMiles ? amount * 0.621371 : amount * 1.609344
const unit = toMiles ? "miles" : "km"

<Card title="Unit converter">
  <Choice value={direction} options={["km to miles", "miles to km"]} onChange={setDirection} />
  <Input label={toMiles ? "Kilometres" : "Miles"} kind="number" value={amount} onChange={setAmount} />
  <Stat label={"In " + unit} value={result.toFixed(2) + " " + unit} />
</Card>
```

=====ANSWER=====

Request 7

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)
const valid = height > 0 && weight > 0
const meters = height / 100
const bmi = valid ? weight / (meters * meters) : 0
const category = !valid ? "Enter both numbers" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese"

<Card title="BMI">
  <Input label="Height (cm)" kind="number" value={height} onChange={setHeight} />
  <Input label="Weight (kg)" kind="number" value={weight} onChange={setWeight} />
  <Stat label="Your BMI" value={valid ? bmi.toFixed(1) : "-"} />
  <Field label="Category" value={category} />
  <Text secondary>BMI is a rough guide. It does not measure body fat.</Text>
</Card>
```

=====ANSWER=====

Request 8

```prism
const [item, setItem] = useState("")
const [qty, setQty] = useState(1)
const [list, setList] = useState([])
const left = list.filter(i => !i.got).length

<Card title="Shopping list">
  <Stat label="Left to buy" value={"" + left} />
  <Input label="Item" value={item} onChange={setItem} placeholder="Milk" />
  <Input label="Quantity" kind="number" value={qty} onChange={setQty} />
  <Button main disabled={item === ""} onPress={() => { setList([...list, { id: list.length + 1, name: item, qty: qty || 1, got: false }]); setItem(""); setQty(1) }}>Add to list</Button>
  {list.map(i => <Switch key={i.id} label={i.qty + " x " + i.name} value={i.got} onChange={v => setList(list.map(x => x.id === i.id ? { ...x, got: v } : x))} />)}
</Card>
```

=====ANSWER=====

Request 9

```prism
const [a1, setA1] = useState("")
const [a2, setA2] = useState("")
const [a3, setA3] = useState("")
const [done, setDone] = useState(false)
const score = (a1 === "Mercury" ? 1 : 0) + (a2 === "Jupiter" ? 1 : 0) + (a3 === "8" ? 1 : 0)

<Stack>
  <Title>Solar system quiz</Title>
  <Text strong>1. Which planet is closest to the Sun?</Text>
  <Options options={["Mercury", "Venus", "Earth"]} value={a1} onChange={setA1} />
  <Text strong>2. Which is the biggest planet?</Text>
  <Options options={["Saturn", "Jupiter", "Neptune"]} value={a2} onChange={setA2} />
  <Text strong>3. How many planets are there?</Text>
  <Options options={["7", "8", "9"]} value={a3} onChange={setA3} />
  <Button main disabled={a1 === "" || a2 === "" || a3 === ""} onPress={() => setDone(true)}>See my score</Button>
  {done && <Stat label="Your score" value={score + " of 3"} />}
</Stack>
```

=====ANSWER=====

Request 10

```prism
const [servings, setServings] = useState(4)
const f = servings / 4
const scale = n => Math.round(n * f * 10) / 10

<Card title="Pancakes" subtitle={"Makes " + servings + " servings"}>
  <Slider label="Servings" value={servings} min={1} max={12} onChange={setServings} />
  <Field label="Flour" value={scale(125) + " g"} />
  <Field label="Milk" value={scale(240) + " ml"} />
  <Field label="Eggs" value={"" + scale(2)} />
  <Field label="Butter, melted" value={scale(30) + " g"} />
  <Field label="Sugar" value={scale(15) + " g"} />
  <Field label="Baking powder" value={scale(10) + " g"} />
  <Field label="Salt" value="A pinch" />
</Card>
```

=====ANSWER=====

Request 11

I split the rest of the bill evenly between Ana and Ben, and Chris pays only his salad.

```prism
const [bill, setBill] = useState(90)
const [salad, setSalad] = useState(12)
const shared = (bill || 0) - (salad || 0)
const each = shared / 2

<Card title="Dinner split">
  <Input label="Total bill ($)" kind="number" value={bill} onChange={setBill} />
  <Input label="Chris's salad ($)" kind="number" value={salad} onChange={setSalad} />
  <Field label="Ana pays" value={"$" + each.toFixed(2)} />
  <Field label="Ben pays" value={"$" + each.toFixed(2)} />
  <Field label="Chris pays" value={"$" + (salad || 0).toFixed(2)} />
</Card>
```

=====ANSWER=====

Request 12

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const habits = ["Read", "Walk", "Water"]
const [done, setDone] = useState({ Read: [], Walk: [], Water: [] })
const ticks = habits.reduce((sum, h) => sum + done[h].length, 0)

<Stack>
  <Title>This week</Title>
  <Progress value={ticks / 21} label={ticks + " of 21 done"} />
  {habits.map(h => <Card key={h} title={h}>
    <Row wrap>
      {days.map(d => <Switch key={d} label={d} value={done[h].includes(d)} onChange={v => setDone({ ...done, [h]: v ? [...done[h], d] : done[h].filter(x => x !== d) })} />)}
    </Row>
  </Card>)}
</Stack>
```

=====ANSWER=====

Request 13

I do not have the forecast for the next 3 hours, so that part is left out.

```prism
<Card title="London today" subtitle="Cloudy">
  <Stat label="Temperature" value="18°C" />
  <Field label="Sky" value="Cloudy" />
  <Field label="Humidity" value="60%" />
  <Field label="Wind" value="12 km/h" />
</Card>
```

=====ANSWER=====

Request 14

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const digits = "0123456789".split("")
const hasNumber = digits.some(d => password.includes(d))
const hasCapital = password.toLowerCase() !== password
const strong = password.length >= 8 && hasNumber && hasCapital
const hint = password === "" ? "" : strong ? "Strong password" : "Use 8 or more characters, with a capital letter and a number"
const filled = name !== "" && email !== "" && password !== ""

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} />
  <Input label="Email" kind="email" value={email} onChange={setEmail} />
  <Input label="Password" value={password} onChange={setPassword} />
  {hint !== "" && <Text secondary>{hint}</Text>}
  <Button main disabled={!filled} onPress={() => P.toast("Account created")}>Sign up</Button>
</Card>
```

=====ANSWER=====

Request 15

A live countdown needs a clock that ticks by itself, and this screen cannot do that. Instead, you tap to take time off.

```prism
const [left, setLeft] = useState(300)
const minutes = Math.floor(left / 60)
const secs = left % 60
const shown = minutes + ":" + (secs < 10 ? "0" + secs : "" + secs)

<Card title="5-minute timer">
  <Stat label="Time left" value={shown} />
  <Progress value={left / 300} />
  <Row>
    <Button main onPress={() => setLeft(Math.max(0, left - 30))}>Take 30 seconds off</Button>
    <Button onPress={() => setLeft(300)}>Reset</Button>
  </Row>
</Card>
```

=====ANSWER=====

Request 16

```prism
const [yearly, setYearly] = useState(false)
const plans = [
  { name: "Free", monthly: "$0", yearly: "$0" },
  { name: "Pro", monthly: "$12 a month", yearly: "$120 a year" },
  { name: "Team", monthly: "$30 a month", yearly: "$300 a year" }
]

<Stack>
  <Choice value={yearly ? "Yearly" : "Monthly"} options={["Monthly", "Yearly"]} onChange={v => setYearly(v === "Yearly")} />
  <Compare items={plans.map(p => ({ name: p.name, price: yearly ? p.yearly : p.monthly }))} fields={[{ label: "Price", value: "price" }]} />
</Stack>
```

=====ANSWER=====

Request 17

```prism
const steps = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const total = steps.reduce((sum, s) => sum + s, 0)

<Stack>
  <Stat label="Average per day" value={Math.round(total / 7).toLocaleString("en-US")} />
  <Chart kind="bar" label="Steps per day, last 7 days" data={steps} labels={["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]} />
</Stack>
```

=====ANSWER=====

Request 18

I cannot add the photo here, so the card shows the text only.

```prism
const [count, setCount] = useState(0)

<Card title="Wireless headphones">
  <Stat label="Price" value="$129" />
  <Text>4.5 out of 5 stars</Text>
  <Button main onPress={() => { setCount(count + 1); P.toast("Added to cart") }}>Add to cart</Button>
</Card>
```

=====ANSWER=====

Request 19

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [dates, setDates] = useState("")

<Card title={"Step " + step + " of 3"}>
  {step === 1 && <Stack>
    <Input label="Where to?" value={destination} onChange={setDestination} placeholder="Goa" />
    <Button main disabled={destination === ""} onPress={() => setStep(2)}>Next</Button>
  </Stack>}
  {step === 2 && <Stack>
    <Input label="When?" value={dates} onChange={setDates} placeholder="30 Oct to 3 Nov" />
    <Row>
      <Button onPress={() => setStep(1)}>Back</Button>
      <Button main disabled={dates === ""} onPress={() => setStep(3)}>Next</Button>
    </Row>
  </Stack>}
  {step === 3 && <Stack>
    <Field label="Destination" value={destination} />
    <Field label="Dates" value={dates} />
    <Row>
      <Button onPress={() => setStep(2)}>Back</Button>
      <Button main onPress={() => P.ask("Confirm my trip to " + destination + " for " + dates)}>Confirm trip</Button>
    </Row>
  </Stack>}
</Card>
```

=====ANSWER=====

Request 20

```prism
const features = ["Dark mode", "Offline mode", "Widgets", "Sync across devices"]
const [picked, setPicked] = useState("")
const [voted, setVoted] = useState(false)
const [votes, setVotes] = useState([0, 0, 0, 0])
const total = votes.reduce((sum, v) => sum + v, 0)

<Card title="Which feature should we build next?">
  {!voted && <Stack>
    <Options options={features} value={picked} onChange={setPicked} />
    <Button main disabled={picked === ""} onPress={() => { setVotes(votes.map((v, i) => features[i] === picked ? v + 1 : v)); setVoted(true) }}>Vote</Button>
  </Stack>}
  {voted && <Stack>
    <Text secondary>{total + " votes so far"}</Text>
    <Chart kind="bar" label="Votes per feature" data={votes} labels={features} />
    {features.map((f, i) => <Field key={f} label={f} value={votes[i] + " votes"} />)}
  </Stack>}
</Card>
```

=====ANSWER=====

Request 21

```prism
<Stack>
  <Steps>
    <Step title="Check the site">Your browser asks the site for its certificate, a digital ID, and checks that it is real.</Step>
    <Step title="Agree on a secret key">The browser and the site create a shared key that only the two of them know.</Step>
    <Step title="Scramble your data">Your password and other data are locked with that key before they leave your device.</Step>
    <Step title="Unlock at the site">Only the real site has the key to read it. People on the same Wi-Fi see only scrambled text.</Step>
  </Steps>
  <Callout title="Good to know">HTTPS protects data on its way. It does not stop a site from storing your password badly.</Callout>
</Stack>
```

=====ANSWER=====

Request 22

```prism
<Stack>
  <Flow
    nodes={[
      { title: "You open the page" },
      { title: "Check saved copy" },
      { title: "Use saved copy" },
      { title: "Download from server" },
      { title: "Save a copy" },
      { title: "Show the page" }
    ]}
    links={[
      { from: "You open the page", to: "Check saved copy" },
      { from: "Check saved copy", to: "Use saved copy", label: "found" },
      { from: "Check saved copy", to: "Download from server", label: "not found" },
      { from: "Download from server", to: "Save a copy" },
      { from: "Save a copy", to: "Show the page" },
      { from: "Use saved copy", to: "Show the page" }
    ]}
  />
  <Callout title="Why it is faster">On the second visit, the browser skips most of the download.</Callout>
</Stack>
```

=====ANSWER=====

Request 23

```prism
<Card title="Exercise: lists">
  <Text>Make a list called fruits with apple, banana and cherry. Then print the second fruit.</Text>
  <Reveal label="Show hint">
    <Text>Lists start counting from 0, so the second item is at position 1.</Text>
  </Reveal>
  <Reveal label="Show answer">
    <Code language="python" code={"fruits = [\"apple\", \"banana\", \"cherry\"]\nprint(fruits[1])"} />
  </Reveal>
</Card>
```

=====ANSWER=====

Request 24

```prism
const [level, setLevel] = useState("")
const [topics, setTopics] = useState([])

<Stack>
  <Title>Your Python plan</Title>
  <Text strong>What is your level?</Text>
  <Options options={["New to it", "Some practice", "Expert"]} value={level} onChange={setLevel} />
  <Text strong>Which topics do you care about?</Text>
  <Options options={["Variables", "Loops", "Functions", "Lists", "Files", "Websites"]} multiple onChange={setTopics} />
  <Button main disabled={level === "" || topics.length === 0} onPress={() => P.ask("My level is " + level + ". I want to learn: " + topics.join(", ") + ".")}>Start my plan</Button>
</Stack>
```

=====ANSWER=====

Request 25

```prism
<Card title="Book a table at Toit">
  <Field label="Restaurant" value="Toit" />
  <Field label="Day" value="Saturday, 24 October" />
  <Field label="Time" value="8:00 pm" />
  <Field label="People" value="4" />
  <Form submit="Book table" fields={[{ name: "name", label: "Your name", required: true }, { name: "phone", label: "Phone number", kind: "phone", required: true }]} />
</Card>
```

=====ANSWER=====

Request 26

Next Friday is 30 October 2026. Here is my plan. Tell me where you are flying from, and I will start once you say yes.

```prism
<Stack>
  <Plan items={[
    { title: "Search flights to Goa", state: "waiting", detail: "Friday 30 October" },
    { title: "Compare prices", state: "waiting" },
    { title: "Show you the cheapest options", state: "waiting" },
    { title: "Hold the seat you pick", state: "waiting", detail: "Only after you say yes" }
  ]} />
  <Button main onPress={() => P.ask("Yes, start the flight search to Goa for Friday 30 October")}>Start the search</Button>
</Stack>
```

=====ANSWER=====

Request 27

I need Priya's email address and your notes before I can send this.

```prism
const [email, setEmail] = useState("")
const [notes, setNotes] = useState("")

<Stack>
  <Input label="Priya's email" kind="email" value={email} onChange={setEmail} />
  <Input label="Notes from today's class" multiline value={notes} onChange={setNotes} />
  {email !== "" && <Confirm title="Send this email to Priya?" action="send_email" args={{ to: email, subject: "Notes from today's class", body: notes + "\n\nSee you Monday!" }} allow="Send">
    <Field label="To" value={email} />
    <Field label="Message" value="See you Monday!" />
  </Confirm>}
</Stack>
```

=====ANSWER=====

Request 28

```prism
<Confirm title="Delete all backups from before 2025?" action="delete_backups" args={{ before: "2025-01-01" }} allow="Delete" danger>
  <Callout status="bad" title="This can't be undone">Every backup made before 1 January 2025 will be lost.</Callout>
</Confirm>
```

=====ANSWER=====

Request 29

```prism
<Stack>
  <Card title="Python">
    <Field label="Created by" value="Guido van Rossum" />
    <Field label="First released" value="1991" />
    <Text secondary>Guido van Rossum created Python and first released it in 1991 [1][2].</Text>
  </Card>
  <Sources items={[
    { title: "Foreword for Programming Python", site: "python.org", url: "https://www.python.org/doc/essays/foreword/" },
    { title: "Python (programming language)", site: "wikipedia.org", url: "https://en.wikipedia.org/wiki/Python_(programming_language)" }
  ]} />
</Stack>
```

=====ANSWER=====

Request 30

```prism
<Stack>
  <Flow
    nodes={[
      { title: "You enter password" },
      { title: "App checks it" },
      { title: "Open your account" },
      { title: "Show an error" }
    ]}
    links={[
      { from: "You enter password", to: "App checks it" },
      { from: "App checks it", to: "Open your account", label: "correct" },
      { from: "App checks it", to: "Show an error", label: "wrong" },
      { from: "Show an error", to: "You enter password", label: "try again" }
    ]}
  />
  <Callout title="Good to know">The app compares a stored code with what you typed. It does not keep your password as plain text.</Callout>
</Stack>
```

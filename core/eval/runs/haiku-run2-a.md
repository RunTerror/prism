Here is a tip calculator that splits the bill between people.

```prism
const [bill, setBill] = useState(50)
const [tip, setTip] = useState(15)
const [people, setPeople] = useState(2)
const b = bill || 0
const total = b + b * tip / 100
const each = people > 0 ? total / people : 0

<Card title="Tip calculator" subtitle="Split the bill">
  <Input label="Bill" kind="number" value={bill} onChange={setBill} />
  <Slider label="Tip %" value={tip} min={0} max={30} step={1} onChange={setTip} />
  <Input label="People" kind="number" value={people} onChange={setPeople} />
  <Divider />
  <Stat label="Total with tip" value={"$" + total.toFixed(2)} />
  <Stat label="Each person pays" value={"$" + each.toFixed(2)} tone="success" />
</Card>
```
=====ANSWER=====
Here is a comparison of the three phone plans where you can choose one.

```prism
const [choice, setChoice] = useState("")
const plans = [
  { name: "Basic", price: "$10", data: "5 GB" },
  { name: "Plus", price: "$20", data: "20 GB" },
  { name: "Max", price: "$35", data: "Unlimited" }
]

<Stack gap="md">
  <Table>
    <TableRow>
      <Cell header>Plan</Cell>
      <Cell header align="end">Price</Cell>
      <Cell header align="end">Data</Cell>
    </TableRow>
    {plans.map(p => (
      <TableRow key={p.name}>
        <Cell>{p.name}</Cell>
        <Cell align="end">{p.price}</Cell>
        <Cell align="end">{p.data}</Cell>
      </TableRow>
    ))}
  </Table>
  <Row wrap>
    {plans.map(p => (
      <Button key={p.name} variant={choice === p.name ? "solid" : "outline"} onPress={() => setChoice(p.name)}>{p.name}</Button>
    ))}
  </Row>
  {choice !== "" && <Callout tone="success" title="Chosen">You picked {choice}.</Callout>}
</Stack>
```
=====ANSWER=====
Here is a simple workout tracker where you can add exercises and tick them off.

```prism
const [exercises, setExercises] = useState([{ id: 1, name: "Push-ups", done: false }])
const [draft, setDraft] = useState("")
const left = exercises.filter(e => !e.done).length

<Card title="Workout" subtitle={left + " left"}>
  {exercises.map(e => (
    <Checkbox key={e.id} label={e.name} value={e.done}
      onChange={v => setExercises(exercises.map(x => x.id === e.id ? { ...x, done: v } : x))} />
  ))}
  <Row>
    <Input value={draft} onChange={setDraft} placeholder="New exercise" />
    <Button icon="plus" disabled={!draft.trim()} onPress={() => {
      setExercises([...exercises, { id: Date.now(), name: draft.trim(), done: false }])
      setDraft("")
    }}>Add</Button>
  </Row>
</Card>
```
=====ANSWER=====
Here is your monthly budget with what is left from your income.

```prism
const income = 2500
const items = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = items.reduce((s, i) => s + i.amount, 0)
const left = income - spent

<Card title="Monthly budget" subtitle={"Income $" + income}>
  {items.map(i => (
    <Progress key={i.name} label={i.name + " $" + i.amount} value={i.amount / income} />
  ))}
  <Divider />
  <Row justify="between">
    <Text>Spent</Text>
    <Text weight="bold">{"$" + spent}</Text>
  </Row>
  <Row justify="between">
    <Text>Left</Text>
    <Text weight="bold" tone={left < 0 ? "danger" : "success"}>{"$" + left}</Text>
  </Row>
</Card>
```
=====ANSWER=====
Here is a notifications settings screen with a volume slider and a quiet hours switch.

```prism
const [notifications, setNotifications] = useState(true)
const [volume, setVolume] = useState(60)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications" subtitle="Choose how you are alerted">
  <Switch label="Notifications" value={notifications} onChange={setNotifications} />
  <Slider label="Volume" value={volume} min={0} max={100} step={1} disabled={!notifications} onChange={setVolume} />
  <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  {quiet && <Callout tone="info" title="Quiet hours on">Alerts are muted at night.</Callout>}
</Card>
```
=====ANSWER=====
Here is a unit converter between kilometres and miles.

```prism
const [dir, setDir] = useState("km to mi")
const [amount, setAmount] = useState(10)
const a = amount || 0
const result = dir === "km to mi" ? a * 0.621371 : a / 0.621371
const unit = dir === "km to mi" ? "mi" : "km"

<Card title="Unit converter">
  <Select label="Direction" value={dir} options={["km to mi", "mi to km"]} onChange={setDir} />
  <Input label="Amount" kind="number" value={amount} onChange={setAmount} />
  <Stat label="Result" value={result.toFixed(2) + " " + unit} />
</Card>
```
=====ANSWER=====
Here is a BMI calculator that shows your category.

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)
const h = (height || 0) / 100
const bmi = h > 0 ? (weight || 0) / (h * h) : 0
const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese"
const tone = bmi < 18.5 ? "warning" : bmi < 25 ? "success" : bmi < 30 ? "warning" : "danger"

<Card title="BMI calculator">
  <Input label="Height (cm)" kind="number" value={height} onChange={setHeight} />
  <Input label="Weight (kg)" kind="number" value={weight} onChange={setWeight} />
  <Stat label="BMI" value={bmi.toFixed(1)} tone={tone} />
  <Callout tone={tone} title={category}>Based on your height and weight.</Callout>
</Card>
```
=====ANSWER=====
Here is a shopping list with quantities and a count of what is left to buy.

```prism
const [items, setItems] = useState([{ id: 1, name: "Milk", qty: 2, done: false }])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)
const left = items.filter(i => !i.done).length

<Card title="Shopping list" subtitle={left + " left to buy"}>
  {items.map(i => (
    <Checkbox key={i.id} label={i.name + " x" + i.qty} value={i.done}
      onChange={v => setItems(items.map(x => x.id === i.id ? { ...x, done: v } : x))} />
  ))}
  <Row>
    <Input value={name} onChange={setName} placeholder="Item" />
    <Input kind="number" value={qty} onChange={setQty} placeholder="Qty" />
    <Button icon="plus" disabled={!name.trim()} onPress={() => {
      setItems([...items, { id: Date.now(), name: name.trim(), qty: qty || 1, done: false }])
      setName("")
      setQty(1)
    }}>Add</Button>
  </Row>
</Card>
```
=====ANSWER=====
Here is a 3-question quiz about the solar system that shows your score at the end.

```prism
const questions = [
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars"], answer: "Mercury" },
  { q: "Which is the largest planet?", options: ["Saturn", "Neptune", "Jupiter"], answer: "Jupiter" },
  { q: "What is at the centre of the solar system?", options: ["The Moon", "The Sun", "Earth"], answer: "The Sun" }
]
const [step, setStep] = useState(0)
const [score, setScore] = useState(0)

<Card title="Solar system quiz" subtitle={step < questions.length ? "Question " + (step + 1) + " of 3" : "Finished"}>
  {step < questions.length ? (
    <Stack gap="md">
      <Text weight="semibold">{questions[step].q}</Text>
      {questions[step].options.map(o => (
        <Button key={o} variant="outline" onPress={() => {
          if (o === questions[step].answer) setScore(score + 1)
          setStep(step + 1)
        }}>{o}</Button>
      ))}
    </Stack>
  ) : (
    <Stack gap="md">
      <Title size="lg">Your score</Title>
      <Stat label="Correct" value={score + " of 3"} tone="success" />
      <Button onPress={() => { setStep(0); setScore(0) }}>Try again</Button>
    </Stack>
  )}
</Card>
```
=====ANSWER=====
Here is a pancake recipe where you can change the servings and the ingredients scale to match.

```prism
const [servings, setServings] = useState(4)
const k = (servings || 1) / 4
const ingredients = [
  { name: "Flour", amount: 150, unit: "g" },
  { name: "Milk", amount: 250, unit: "ml" },
  { name: "Eggs", amount: 2, unit: "" },
  { name: "Sugar", amount: 15, unit: "g" },
  { name: "Butter", amount: 20, unit: "g" }
]

<Card title="Pancakes" subtitle={"Serves " + (servings || 1)}>
  <Slider label="Servings" value={servings} min={1} max={12} step={1} onChange={setServings} />
  <Table>
    {ingredients.map(i => (
      <TableRow key={i.name}>
        <Cell>{i.name}</Cell>
        <Cell align="end">{(Math.round(i.amount * k * 10) / 10) + " " + i.unit}</Cell>
      </TableRow>
    ))}
  </Table>
</Card>
```

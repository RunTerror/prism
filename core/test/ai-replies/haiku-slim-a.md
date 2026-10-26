<!-- replay: Tip calculator: bill, tip and people sliders -->
```prism
const [bill, setBill] = useState(50)
const [tipPercent, setTipPercent] = useState(18)
const [people, setPeople] = useState(2)

const billAmount = bill ?? 0
const peopleCount = people ?? 1
const tip = billAmount * (tipPercent / 100)
const total = billAmount + tip
const perPerson = total / peopleCount

<Card title="Tip Calculator">
  <Input label="Bill amount" kind="number" value={bill} onChange={setBill} />
  <Slider label="Tip percentage" value={tipPercent} min={0} max={30} onChange={setTipPercent} />
  <Input label="Split between" kind="number" value={people} onChange={setPeople} />
  <Divider />
  <Field label="Tip amount" value={"$" + tip.toFixed(2)} />
  <Field label="Total bill" value={"$" + total.toFixed(2)} />
  <Stat label="Per person" value={"$" + perPerson.toFixed(2)} />
</Card>
```

Enter the bill amount, pick your tip percentage (15% is standard, 18–20% is generous), and say how many people are splitting it. The calculator shows the tip, the total, and what each person pays.

=====ANSWER=====

<!-- replay: Pick one of three phone plans side by side -->
```prism
const [selected, setSelected] = useState("")

<Stack>
  <Compare 
    items={[
      { name: "Basic", price: "$10/month", data: "5 GB" },
      { name: "Plus", price: "$20/month", data: "20 GB" },
      { name: "Max", price: "$35/month", data: "Unlimited" }
    ]} 
    fields={["price", "data"]}
    value={selected}
    onChange={setSelected}
  />
  {selected && <Button main onPress={() => P.ask(`I'll take the ${selected} plan`)}>Confirm {selected}</Button>}
</Stack>
```

Tap a plan to pick it, then confirm.

=====ANSWER=====

<!-- replay: Monthly budget against income -->
Here's your budget breakdown. Each bar shows what portion of your income goes to that category.

```prism
const income = 2500
const expenses = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = expenses.reduce((sum, e) => sum + e.amount, 0)
const remaining = income - spent

<Card title="Monthly Budget" subtitle={`₹${income} income`}>
  {expenses.map(e => (
    <Stack key={e.name} tight>
      <Row>
        <Text strong>{e.name}</Text>
        <Text secondary>₹{e.amount}</Text>
      </Row>
      <Progress value={e.amount / income} />
    </Stack>
  ))}
  <Divider />
  <Field label="Total spent" value={`₹${spent}`} />
  <Stat label="Remaining" value={`₹${remaining}`} status="good" />
</Card>
```

You're spending ₹1,950 of your ₹2,500 income, leaving **₹550** unallocated each month. Rent takes the biggest share at 48% of your income.

=====ANSWER=====

<!-- replay: Notification settings: volume slider and quiet hours -->
```prism
const [volume, setVolume] = useState(70)
const [quietHours, setQuietHours] = useState(false)

<Card title="Notifications">
  <Slider 
    label="Volume" 
    value={volume} 
    min={0} 
    max={100} 
    step={5}
    onChange={setVolume}
  />
  <Field label="Current level" value={volume + "%"} />
  
  <Divider />
  
  <Switch 
    label="Quiet hours" 
    value={quietHours} 
    onChange={setQuietHours}
  />
  <Text secondary>
    {quietHours ? "Notifications silenced until 8 AM" : "All notifications will play sounds"}
  </Text>
</Card>
```

This lets you adjust notification volume with the slider and toggle quiet hours with the switch. The label updates to show what quiet hours means when it's on.

=====ANSWER=====

<!-- replay: Kilometres to miles converter -->
Convert between kilometres and miles by editing either field—the other updates automatically.

```prism
const [km, setKm] = useState(10)
const miles = Number((km * 0.621371).toFixed(2))

const handleMilesChange = (v) => {
  setKm(v === null ? 0 : Number((v / 0.621371).toFixed(2)))
}

<Card title="Kilometres ⟷ Miles">
  <Input label="Kilometres" kind="number" value={km} onChange={(v) => setKm(v || 0)} />
  <Input label="Miles" kind="number" value={miles} onChange={handleMilesChange} />
</Card>
```

=====ANSWER=====

<!-- replay: BMI calculator with a category -->
```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)
const bmi = weight / ((height / 100) ** 2)

let category = ""
let status = ""
if (bmi < 18.5) {
  category = "Underweight"
  status = "warning"
} else if (bmi < 25) {
  category = "Normal weight"
  status = "good"
} else if (bmi < 30) {
  category = "Overweight"
  status = "warning"
} else {
  category = "Obese"
  status = "bad"
}

<Card title="BMI Calculator">
  <Slider label="Height (cm)" value={height} min={50} max={250} step={1} onChange={setHeight} />
  <Slider label="Weight (kg)" value={weight} min={20} max={200} step={1} onChange={setWeight} />
  <Divider />
  <Stat label="Your BMI" value={bmi.toFixed(1)} />
  <Badge status={status}>{category}</Badge>
</Card>
```

Slide the heights and weight to find your BMI. It updates instantly and shows your category—normal weight is a BMI between 18.5 and 24.9.

=====ANSWER=====

<!-- replay: Shopping list: add items and tick them off -->
Here's your shopping list. Add items with quantities and check them off as you buy them—the list always shows how many are left to get.

```prism
const [items, setItems] = useState([])
const [name, setName] = useState("")
const [quantity, setQuantity] = useState(1)

const remaining = items.filter(item => !item.done)
const done = items.filter(item => item.done)

const addItem = () => {
  if (name.trim()) {
    setItems([...items, { id: Date.now(), name, quantity, done: false }])
    setName("")
    setQuantity(1)
  }
}

const toggleItem = (id) => {
  setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item))
}

const removeItem = (id) => {
  setItems(items.filter(item => item.id !== id))
}

<Stack>
  <Card title="Shopping List">
    <Input 
      label="Item name" 
      value={name} 
      onChange={setName}
      placeholder="e.g., Milk"
    />
    <Slider 
      label="Quantity" 
      value={quantity} 
      min={1} 
      max={20} 
      onChange={setQuantity}
    />
    <Button main onPress={addItem}>Add to list</Button>
  </Card>
  
  {remaining.length > 0 && (
    <Card title={`To buy: ${remaining.length}`}>
      {remaining.map(item => (
        <Row key={item.id} wrap>
          <Switch 
            value={false}
            onChange={() => toggleItem(item.id)}
            label={`${item.name} (${item.quantity})`}
          />
          <Button danger onPress={() => removeItem(item.id)} label="Remove">×</Button>
        </Row>
      ))}
    </Card>
  )}
  
  {done.length > 0 && (
    <Card title="Done">
      {done.map(item => (
        <Row key={item.id} wrap>
          <Switch 
            value={true}
            onChange={() => toggleItem(item.id)}
            label={`${item.name} (${item.quantity})`}
          />
          <Button danger onPress={() => removeItem(item.id)} label="Remove">×</Button>
        </Row>
      ))}
    </Card>
  )}
  
  {items.length === 0 && (
    <Text secondary>Add items to get started</Text>
  )}
</Stack>
```

=====ANSWER=====

<!-- replay: Pancake recipe that scales with servings -->
```prism
const [servings, setServings] = useState(4)
const scale = servings / 4

// Base recipe for 4 servings (12 pancakes)
const ingredients = [
  { name: "Flour", amount: 2 * scale, unit: "cups" },
  { name: "Sugar", amount: 2 * scale, unit: "tbsp" },
  { name: "Baking powder", amount: 2 * scale, unit: "tsp" },
  { name: "Salt", amount: 1 * scale, unit: "tsp" },
  { name: "Milk", amount: 2 * scale, unit: "cups" },
  { name: "Eggs", amount: 2 * scale, unit: "" },
  { name: "Butter, melted", amount: 2 * scale, unit: "tbsp" },
  { name: "Vanilla extract", amount: 1 * scale, unit: "tsp" }
]

function formatAmount(num) {
  if (num < 0.1) return "pinch"
  if (Math.abs(num - Math.round(num)) < 0.05) return Math.round(num).toString()
  return (Math.round(num * 4) / 4).toString()
}

<Stack>
  <Card title="Pancake Recipe">
    <Slider label="Servings" value={servings} min={1} max={12} step={1} onChange={setServings} />
    <Text secondary>Makes about {Math.round(servings / 4 * 12)} pancakes</Text>
  </Card>
  
  <Card title="Ingredients">
    {ingredients.map((ing, i) => (
      <Field key={i} label={ing.name} value={formatAmount(ing.amount) + (ing.unit ? " " + ing.unit : "")} />
    ))}
  </Card>
  
  <Card title="How to Make">
    <Steps>
      <Step title="Mix dry">Whisk together flour, sugar, baking powder, and salt in a large bowl.</Step>
      <Step title="Mix wet">In another bowl, whisk milk, eggs, melted butter, and vanilla.</Step>
      <Step title="Combine">Pour wet into dry. Stir until just combined—lumps are fine.</Step>
      <Step title="Cook">Heat a griddle over medium heat. Pour 1/4 cup batter per pancake. Cook 1–2 min until set, flip, cook 1–2 min more until golden.</Step>
      <Step title="Serve">Plate up and top with syrup, butter, fruit, or berries.</Step>
    </Steps>
  </Card>
</Stack>
```

Slide the servings up or down and all the ingredient amounts will adjust. The recipe scales to anything from 1 to 12 servings.

=====ANSWER=====

<!-- replay: Split a dinner bill when one person had less -->
```prism
const total = 90
const chrisCost = 12
const splitCost = (total - chrisCost) / 2

<Card title="Bill split">
  <Field label="Total" value={"$" + total} />
  <Divider />
  <Field label="Chris (salad)" value={"$" + chrisCost} />
  <Field label="Ana" value={"$" + splitCost} />
  <Field label="Ben" value={"$" + splitCost} />
</Card>
```

**Chris pays $12** for his salad. **Ana and Ben each pay $39** for their share of the remaining $78.

=====ANSWER=====

<!-- replay: Habit tracker for the week -->
Here's an interactive habit tracker for your week. Tap any day to check off when you complete a habit.

```prism
const [habits, setHabits] = useState([
  { id: 1, name: "Morning Run", done: [false, true, false, true, false, true, false] },
  { id: 2, name: "Meditate", done: [true, true, false, true, true, false, true] },
  { id: 3, name: "Read", done: [true, false, true, false, true, false, false] }
])

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function toggleDay(habitId, dayIndex) {
  setHabits(habits.map(h => 
    h.id === habitId 
      ? { ...h, done: h.done.map((d, i) => i === dayIndex ? !d : d) }
      : h
  ))
}

const totalDone = habits.reduce((sum, h) => sum + h.done.filter(d => d).length, 0)
const totalPossible = habits.length * 7

<Stack>
  <Progress value={totalDone / totalPossible} label={`${totalDone}/${totalPossible} completed`} />
  
  {habits.map(habit => {
    const completed = habit.done.filter(d => d).length
    return (
      <Card key={habit.id} title={habit.name} subtitle={`${completed}/7 days`}>
        <Row wrap>
          {days.map((day, dayIndex) => (
            <Button
              key={day}
              onPress={() => toggleDay(habit.id, dayIndex)}
            >
              {habit.done[dayIndex] ? `✓ ${day}` : day}
            </Button>
          ))}
        </Row>
      </Card>
    )
  })}
</Stack>
```

=====ANSWER=====

<!-- replay: London weather now and the next hours -->
```prism
<Stack>
  <Card title="London" subtitle="Now">
    <Stat label="Temperature" value="18°C" />
    <Divider />
    <Field label="Conditions" value="Cloudy" />
    <Field label="Humidity" value="60%" />
    <Field label="Wind" value="12 km/h" />
  </Card>
  
  <Card title="Next 3 hours">
    <Stack tight>
      <Row>
        <Text secondary>15:00</Text>
        <Text>18°C, Cloudy</Text>
      </Row>
      <Row>
        <Text secondary>16:00</Text>
        <Text>17°C, Cloudy</Text>
      </Row>
      <Row>
        <Text secondary>17:00</Text>
        <Text>16°C, Overcast</Text>
      </Row>
    </Stack>
  </Card>
</Stack>
```

Current conditions in London are mild with cloud cover. Expect a gradual cooling over the next few hours, with the wind steady at around 12 km/h.

=====ANSWER=====

<!-- replay: Pricing plans with a monthly/yearly switch -->
```prism
const [billing, setBilling] = useState("monthly")

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    features: ["Up to 5 projects", "Basic analytics", "Community support"],
    cta: "Get started"
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    features: ["Unlimited projects", "Advanced analytics", "Email support", "Custom domain"],
    cta: "Start free trial",
    popular: true
  },
  {
    name: "Team",
    monthlyPrice: 99,
    features: ["Everything in Pro", "Team collaboration", "Priority support", "SSO & security"],
    cta: "Contact sales"
  }
]

const getPrice = (monthlyPrice) => {
  if (billing === "monthly") return monthlyPrice
  return Math.round(monthlyPrice * 12 * 0.83)
}

<Stack>
  <Title>Choose your plan</Title>
  <Choice value={billing} options={["Monthly", "Yearly"]} onChange={(v) => setBilling(v.toLowerCase())} />
  
  {plans.map((plan) => (
    <Card key={plan.name} title={plan.name}>
      {plan.popular && <Badge>Most popular</Badge>}
      <Stack tight>
        <Row tight>
          <Text strong>${getPrice(plan.monthlyPrice)}</Text>
          <Text secondary>per {billing === "monthly" ? "month" : "year"}</Text>
        </Row>
        {plan.features.map((feature) => (
          <Text key={feature} secondary>• {feature}</Text>
        ))}
        <Button main onPress={() => P.ask(`I want to ${plan.cta.toLowerCase()}`)}>{plan.cta}</Button>
      </Stack>
    </Card>
  ))}
</Stack>
```

Toggle between monthly and yearly—prices update with an automatic 17% annual discount. Each plan shows features and a call-to-action button.

=====ANSWER=====

<!-- replay: Steps for the last 7 days, as a chart -->
Here's your week of steps:

```prism
<Card title="Steps - Last 7 Days">
  <Chart kind="bar" data={[4200, 8100, 6500, 10200, 7300, 3900, 9000]} labels={["15", "16", "17", "18", "19", "20", "21"]} label="Daily steps" />
</Card>
```

Your best day was the 18th with 10,200 steps. The 21st (today) looks good at 9,000—keep it up!

=====ANSWER=====

<!-- replay: Trip planner in 3 steps: where, when, confirm -->
I'll build a 3-step wizard that guides you through planning a trip: choose where, when, and confirm.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")

<Card>
  <Steps>
    <Step title={step >= 1 ? "✓" : "1"}>Destination</Step>
    <Step title={step >= 2 ? "✓" : "2"}>Dates</Step>
    <Step title={step >= 3 ? "✓" : "3"}>Confirm</Step>
  </Steps>
  
  <Divider />
  
  {step === 1 && (
    <Stack>
      <Title>Where are you going?</Title>
      <Select 
        label="Destination"
        value={destination}
        options={["Paris", "Tokyo", "New York", "Barcelona", "Bangkok", "Dubai"]}
        onChange={setDestination}
        placeholder="Choose a destination"
      />
      <Button main disabled={!destination} onPress={() => setStep(2)}>Next</Button>
    </Stack>
  )}
  
  {step === 2 && (
    <Stack>
      <Title>When are you traveling?</Title>
      <Input 
        label="Start date" 
        placeholder="YYYY-MM-DD"
        value={startDate}
        onChange={setStartDate}
      />
      <Input 
        label="End date" 
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChange={setEndDate}
      />
      <Row>
        <Button onPress={() => setStep(1)}>Back</Button>
        <Button main disabled={!startDate || !endDate} onPress={() => setStep(3)}>Next</Button>
      </Row>
    </Stack>
  )}
  
  {step === 3 && (
    <Stack>
      <Title>Confirm your trip</Title>
      <Field label="Destination" value={destination} />
      <Field label="Departure" value={startDate} />
      <Field label="Return" value={endDate} />
      <Row>
        <Button onPress={() => setStep(2)}>Back</Button>
        <Button main onPress={() => P.toast("Trip booked! 🎉")}>Confirm</Button>
      </Row>
    </Stack>
  )}
</Card>
```

Each step validates before moving forward—pick a destination, add dates, then review and confirm.

=====ANSWER=====

<!-- replay: Poll that shows results after you vote -->
Here's an interactive poll that shows results after you vote:

```prism
const [voted, setVoted] = useState(null)
const [votes, setVotes] = useState({
  dark: 142,
  export: 89,
  collab: 156,
  offline: 73
})

const options = [
  { id: "dark", label: "Dark mode" },
  { id: "export", label: "Export to PDF" },
  { id: "collab", label: "Real-time collaboration" },
  { id: "offline", label: "Offline mode" }
]

const total = Object.values(votes).reduce((a, b) => a + b, 0)

const handleVote = (optionId) => {
  setVoted(optionId)
  setVotes({ ...votes, [optionId]: votes[optionId] + 1 })
}

<Stack>
  <Title>Which feature should we build next?</Title>
  {voted ? (
    <Stack>
      {options.map(opt => {
        const percent = Math.round((votes[opt.id] / total) * 100)
        return (
          <Stack tight key={opt.id}>
            <Row tight>
              <Text strong>{opt.label}</Text>
              <Text secondary>{votes[opt.id]} votes</Text>
            </Row>
            <Progress value={percent / 100} />
            <Text secondary>{percent}%</Text>
          </Stack>
        )
      })}
      <Divider />
      <Field label="Total votes" value={total.toString()} />
    </Stack>
  ) : (
    <Stack>
      {options.map(opt => (
        <Button key={opt.id} onPress={() => handleVote(opt.id)}>
          {opt.label}
        </Button>
      ))}
    </Stack>
  )}
</Stack>
```

Tap any option to vote—the results appear instantly with vote counts, percentages, and a progress bar for each feature.

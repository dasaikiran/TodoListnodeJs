const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const date_fns = require('date-fns')
const {format, isValid, parseISO, parse, toDate} = date_fns

const app = express()
app.use(express.json())

const db_path = path.join(__dirname, 'todoApplication.db')

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: db_path,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at port 3000....')
    })
  } catch (e) {
    console.log(`dbError : ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const statusFunction = val => {
  // Use logical AND here (&&)
  if (val !== 'TO DO' && val !== 'IN PROGRESS' && val !== 'DONE') {
    return false
  } else {
    return true
  }
}

const priorityFunction = val => {
  // Use logical AND here (&&)
  if (val !== 'HIGH' && val !== 'MEDIUM' && val !== 'LOW') {
    return false
  } else {
    return true
  }
}

const categoryFunction = val => {
  // Use logical AND here (&&)
  if (val !== 'WORK' && val !== 'HOME' && val !== 'LEARNING') {
    return false
  } else {
    return true
  }
}

const dateFunctionBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    categoryArray = ['WORK', 'HOME', 'LEARNING']
    categoryIsInArray = categoryArray.includes(category)

    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    priorityIsInArray = priorityArray.includes(priority)
    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    statusIsInArray = statusArray.includes(status)
    if (statusIsInArray === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)
      const formatedDate = format(new Date(dueDate), 'yyyy-MM-dd')
      console.log(formatedDate)
      const result = toDate(new Date(formatedDate))
      const isValidDate = isValid(result)
      console.log(isValidDate)
      console.log(isValidDate)
      if (isValidDate === true) {
        request.dueDate = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  request.todo = todo
  request.id = id

  request.todoId = todoId

  next()
}

const dateFunctionQuery = async (request, response, next) => {
  const {search_q, category, priority, status, date} = request.query
  const {todoId} = request.params
  if (date !== undefined) {
    try {
      const myDate = new Date(date)
      console.log(myDate)
      const formatedDate = format(new Date(date), 'yyyy-MM-dd')
      console.log(formatedDate, 'f')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )
      console.log(result, 'r')
      console.log(new Date(), 'new')

      const isValidDate = await isValid(result)
      console.log(isValidDate, 'V')
      if (isValidDate === true) {
        request.date = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  next()
}

app.get('/todos/', async (request, response) => {
  const {
    status = '',
    priority = '',
    category = '',
    search_q = '',
  } = request.query

  // Validate status
  if (status && !statusFunction(status)) {
    response.status(400).send('Invalid Todo Status')
    return
  }

  // Validate priority
  if (priority && !priorityFunction(priority)) {
    response.status(400).send('Invalid Todo Priority')
    return
  }

  // Validate category
  if (category && !categoryFunction(category)) {
    response.status(400).send('Invalid Todo Category')
    return
  }

  try {
    const getTodosQuery = `
      SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate 
      FROM todo
      WHERE todo LIKE '%${search_q}%' AND 
            status LIKE '%${status}%' AND 
            priority LIKE '%${priority}%' AND
            category LIKE '%${category}%';`

    const todosArray = await db.all(getTodosQuery)
    response.send(todosArray)
  } catch (error) {
    console.error('Error fetching todos:', error)
    response.status(500).send('Internal Server Error')
  }
})

app.get('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
  select
  id,
  todo,
  priority,
  status,
  category,
  due_date as dueDate 
  from todo 
  where id = ${todoId};`
  const todoItem = await db.get(getTodoQuery)
  response.send(todoItem)
})

app.get('/agenda/', dateFunctionQuery, async (request, response) => {
  const {date} = request

  const getTodoWithDateQuery = `
    select
    id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate 
    from todo 
    where due_date = '${date}'`
  const todoList = await db.all(getTodoWithDateQuery)
  if (todoList === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todoList)
  }
})

app.post('/todos/', dateFunctionBody, async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request

  // Validate status
  if (status && !statusFunction(status)) {
    response.status(400).send('Invalid Todo Status')
    return
  }

  // Validate priority
  if (priority && !priorityFunction(priority)) {
    response.status(400).send('Invalid Todo Priority')
    return
  }

  // Validate category
  if (category && !categoryFunction(category)) {
    response.status(400).send('Invalid Todo Category')
    return
  }

  const postTodoQUery = `
  insert into 
  todo (id, todo, priority, status, category, due_date)
  values (
    ${id},
    '${todo}',
    '${priority}',
    '${status}',
    '${category}',
    '${dueDate}'
  );`
  await db.run(postTodoQUery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId', dateFunctionBody, async (request, response) => {
  const {todoId} = request
  const {
    todo = '',
    priority = '',
    status = '',
    category = '',
    dueDate = '',
  } = request

  // Validate status
  if (status && !statusFunction(status)) {
    response.status(400).send('Invalid Todo Status')
    return
  }

  // Validate priority
  if (priority && !priorityFunction(priority)) {
    response.status(400).send('Invalid Todo Priority')
    return
  }

  // Validate category
  if (category && !categoryFunction(category)) {
    response.status(400).send('Invalid Todo Category')
    return
  }

  let message = ''
  let todoKey = ''
  let todoVal = null
  switch (true) {
    case status !== '':
      message = 'Status'
      todoKey = 'status'
      todoVal = status
      break
    case priority !== '':
      message = 'Priority'
      todoKey = 'priority'
      todoVal = priority
      break
    case todo !== '':
      message = 'Todo'
      todoKey = 'todo'
      todoVal = todo
      break
    case category !== '':
      message = 'Category'
      todoKey = 'category'
      todoVal = category
      break
    case dueDate !== '':
      message = 'Due Date'
      todoKey = 'due_date'

      todoVal = dueDate
      break
    default:
      break
  }
  const putTodoQuery = `
  update todo
  set '${todoKey}' = '${todoVal}'
  where id = ${todoId};`
  await db.run(putTodoQuery)
  response.send(`${message} Updated`)
})

app.delete('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  delete from todo 
  where id = ${todoId};`
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app

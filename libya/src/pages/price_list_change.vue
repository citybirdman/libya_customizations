<template>
  <!-- <div>
  <ListView
    class="h-[250px]"
    :columns="[
      {
        label: 'Name',
        key: 'name',
        width: '243px',
        getLabel: ({ row }) => row.name,
        prefix: ({ row }) => {
          return h(Avatar, {
            shape: 'circle',
            image: row.user_image,
            size: 'sm'
          })
        },
      },
      {
        label: 'Item Code',
        key: 'item_code',
        width: '223px',
      }
    ]"
    :rows= "ItemPrice",
    :options="{
      selectable: true,
      showTooltip: true,
      resizeColumn: true,
      emptyState: {
        title: 'No records found',
        description: 'Create a new record to get started',
        button: {
          label: 'New Record',
          variant: 'solid',
          onClick: () => console.log('New Record'),
        },
      },
    }"
    row-key="id"
  >
    <template #cell="{ item, row, column }">
      <span class="font-medium text-gray-700">
        {{ item }}
      </span>
    </template>
  </ListView> -->
<!-- </div> -->
{{todos}}
</template>
<script setup>
import { createListResource, ListView } from 'frappe-ui';

let todos = createListResource({
    doctype: 'ToDo'
  });
</script>
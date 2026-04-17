"""Utilities for audit tracking"""
from typing import Dict, Any, Optional


def get_model_changes(old_obj: Any, new_obj: Any, ignore_fields: Optional[list] = None) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Compare two model instances and return old and new values for changed fields.
    
    Args:
        old_obj: Original model instance
        new_obj: Updated model instance
        ignore_fields: List of field names to ignore (e.g., ['updated_at', 'created_at'])
    
    Returns:
        Tuple of (old_values_dict, new_values_dict)
    """
    if ignore_fields is None:
        ignore_fields = ['created_at', 'updated_at']
    
    old_values = {}
    new_values = {}
    
    # Get all attributes from the model
    if hasattr(old_obj, '__dict__'):
        for key, old_value in old_obj.__dict__.items():
            if key.startswith('_'):  # Skip SQLAlchemy internals
                continue
            if key in ignore_fields:
                continue
            
            new_value = getattr(new_obj, key, None)
            
            # Only include if changed
            if str(old_value) != str(new_value):
                old_values[key] = old_value
                new_values[key] = new_value
    
    return old_values, new_values


def get_dict_changes(old_dict: Dict[str, Any], new_dict: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Compare two dictionaries and return changed values.
    
    Args:
        old_dict: Original dictionary
        new_dict: Updated dictionary
    
    Returns:
        Tuple of (old_values_dict, new_values_dict)
    """
    old_values = {}
    new_values = {}
    
    # Check for updated and new keys
    for key in set(list(old_dict.keys()) + list(new_dict.keys())):
        old_value = old_dict.get(key)
        new_value = new_dict.get(key)
        
        # Only include if changed
        if str(old_value) != str(new_value):
            if old_value is not None:
                old_values[key] = old_value
            if new_value is not None:
                new_values[key] = new_value
    
    return old_values, new_values
